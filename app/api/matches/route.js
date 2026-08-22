import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getMatches,
  getMatch,
} from "../../../lib/football-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function toScore(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function normalizeMatch(match) {
  if (
    !match ||
    !match.home_team ||
    !match.away_team ||
    !match.match_date ||
    !match.id
  ) {
    return null;
  }

  const parsedDate =
    new Date(match.match_date);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return null;
  }

  return {
    external_id:
      String(match.id),

    league:
      match.league || null,

    league_logo:
      match.league_logo || null,

    home_team:
      String(
        match.home_team
      ).trim(),

    away_team:
      String(
        match.away_team
      ).trim(),

    home_logo:
      match.home_logo || null,

    away_logo:
      match.away_logo || null,

    match_date:
      parsedDate.toISOString(),

    status:
      match.status ||
      "scheduled",

    home_score:
      toScore(
        match.home_score
      ),

    away_score:
      toScore(
        match.away_score
      ),
  };
}

function getSourceSport(match) {
  if (
    match?.sport ===
    "basketball"
  ) {
    return "basketball";
  }

  return "football";
}

function addSportToMatches(
  matches,
  sourceMatches
) {
  const sportMap =
    new Map();

  sourceMatches.forEach(
    (sourceMatch) => {
      if (
        !sourceMatch?.id
      ) {
        return;
      }

      sportMap.set(
        String(
          sourceMatch.id
        ),
        getSourceSport(
          sourceMatch
        )
      );
    }
  );

  return matches.map(
    (match) => ({
      ...match,

      sport:
        sportMap.get(
          String(
            match.external_id
          )
        ) ||
        "football",
    })
  );
}

export async function GET(request) {
  try {
    const supabase =
      getSupabase();

    const { searchParams } =
      new URL(request.url);

    const matchId =
      searchParams.get("id");

    const requestedStatus =
      searchParams.get("status");

    const requestedSport =
      searchParams.get("sport");

    /*
     * =====================================================
     * 1. MAÇKOLİK'TEN TÜM MAÇLARI AL
     *
     * Burada artık hiçbir limit yok.
     *
     * Maçkolik 20 maç verirse 20,
     * 500 maç verirse 500,
     * 1098 maç verirse 1098 alınır.
     * =====================================================
     */

    const sourceMatches =
      await getMatches();

    /*
     * =====================================================
     * 2. KAYNAK MAÇLARI FİLTRELE
     * =====================================================
     */

    let filteredSourceMatches =
      sourceMatches.filter(
        (match) => {
          if (
            requestedSport &&
            match?.sport !==
              requestedSport
          ) {
            return false;
          }

          if (
            requestedStatus &&
            match?.status !==
              requestedStatus
          ) {
            return false;
          }

          return true;
        }
      );

    /*
     * =====================================================
     * 3. TEK MAÇ İSTENİYORSA
     *
     * Önce Maçkolik ID'sine bakıyoruz.
     * Bulamazsak Supabase UUID'si olarak arıyoruz.
     * =====================================================
     */

    if (matchId) {
      let sourceMatch =
        filteredSourceMatches.find(
          (match) =>
            String(
              match?.id
            ) ===
            String(
              matchId
            )
        );

      if (!sourceMatch) {
        const {
          data: databaseMatch,
          error:
            databaseMatchError,
        } = await supabase
          .from("matches")
          .select(
            "id, external_id"
          )
          .eq(
            "id",
            matchId
          )
          .maybeSingle();

        if (
          databaseMatchError
        ) {
          console.error(
            "Match lookup error:",
            databaseMatchError
          );

          return NextResponse.json(
            {
              success: false,
              error:
                databaseMatchError.message,
            },
            {
              status: 500,
            }
          );
        }

        if (
          databaseMatch
            ?.external_id
        ) {
          sourceMatch =
            filteredSourceMatches.find(
              (match) =>
                String(
                  match?.id
                ) ===
                String(
                  databaseMatch.external_id
                )
            );
        }
      }

      if (sourceMatch) {
        filteredSourceMatches =
          [sourceMatch];
      } else {
        filteredSourceMatches =
          [];
      }
    }

    /*
     * =====================================================
     * 4. SUPABASE FORMATINA ÇEVİR
     * =====================================================
     */

    const normalizedMatches =
      filteredSourceMatches
        .map(
          normalizeMatch
        )
        .filter(Boolean);

    /*
     * Aynı external_id varsa
     * tek kayıt tut.
     */

    const uniqueMatches =
      Array.from(
        new Map(
          normalizedMatches.map(
            (match) => [
              match.external_id,
              match,
            ]
          )
        ).values()
      );

    /*
     * =====================================================
     * 5. SUPABASE'E UPSERT
     *
     * Artık 1098 ID'yi ayrıca .in() ile aramıyoruz.
     *
     * Upsert'in döndürdüğü kayıtları doğrudan
     * kullanıyoruz.
     * =====================================================
     */

    let databaseMatches =
      [];

    if (
      uniqueMatches.length > 0
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("matches")
        .upsert(
          uniqueMatches,
          {
            onConflict:
              "external_id",
          }
        )
        .select(`
          id,
          external_id,
          league,
          league_logo,
          home_team,
          away_team,
          home_logo,
          away_logo,
          match_date,
          status,
          home_score,
          away_score,
          created_at,
          updated_at
        `);

      if (error) {
        console.error(
          "Matches upsert error:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            error:
              error.message,
          },
          {
            status: 500,
          }
        );
      }

      databaseMatches =
        data || [];
    }

    /*
     * =====================================================
     * 6. SPORT BİLGİSİNİ EKLE
     * =====================================================
     */

    let matches =
      addSportToMatches(
        databaseMatches,
        filteredSourceMatches
      );

    /*
     * =====================================================
     * 7. TARİHE GÖRE SIRALA
     *
     * API tarafında LIMIT YOK.
     *
     * Maçkolik'ten gelen bütün maçlar döndürülür.
     * =====================================================
     */

    matches.sort(
      (a, b) => {
        const dateA =
          new Date(
            a.match_date
          ).getTime();

        const dateB =
          new Date(
            b.match_date
          ).getTime();

        return dateA - dateB;
      }
    );

    /*
     * =====================================================
     * 8. TEK MAÇ İÇİN CANLI DETAY
     * =====================================================
     */

    if (
      matchId &&
      matches.length > 0
    ) {
      const currentMatch =
        matches[0];

      if (
        currentMatch.status ===
        "live"
      ) {
        try {
          const detail =
            await getMatch(
              currentMatch.external_id
            );

          if (detail) {
            const liveMinute =
              detail?.live_minute ||
              null;

            matches =
              matches.map(
                (item) => ({
                  ...item,

                  live_minute:
                    liveMinute,
                })
              );
          }
        } catch (error) {
          console.error(
            "Live match detail error:",
            error
          );
        }
      }
    }

    /*
     * =====================================================
     * 9. CEVAP
     *
     * BURADA LIMIT YOK.
     * =====================================================
     */

    return NextResponse.json(
      {
        success: true,

        matches,

        source:
          "Mackolik",

        source_count:
          filteredSourceMatches.length,

        total_source_matches:
          sourceMatches.length,

        returned_count:
          matches.length,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma:
            "no-cache",

          Expires:
            "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Matches GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Maçlar alınırken sunucu hatası oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request
) {
  try {
    const body =
      await request.json();

    const {
      external_id,
      league,
      league_logo,
      home_team,
      away_team,
      home_logo,
      away_logo,
      match_date,
      status = "scheduled",
      home_score,
      away_score,
    } = body || {};

    if (
      !home_team ||
      !away_team ||
      !match_date
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Ev sahibi, deplasman ve maç tarihi zorunludur.",
        },
        {
          status: 400,
        }
      );
    }

    const parsedDate =
      new Date(match_date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Geçersiz maç tarihi.",
        },
        {
          status: 400,
        }
      );
    }

    const validStatuses = [
      "scheduled",
      "upcoming",
      "live",
      "finished",
      "postponed",
      "cancelled",
    ];

    if (
      !validStatuses.includes(
        status
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Geçersiz maç durumu.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      getSupabase();

    const matchData = {
      external_id:
        external_id || null,

      league:
        league || null,

      league_logo:
        league_logo || null,

      home_team:
        String(
          home_team
        ).trim(),

      away_team:
        String(
          away_team
        ).trim(),

      home_logo:
        home_logo || null,

      away_logo:
        away_logo || null,

      match_date:
        parsedDate.toISOString(),

      status,

      home_score:
        toScore(
          home_score
        ),

      away_score:
        toScore(
          away_score
        ),
    };

    let result;

    if (external_id) {
      result =
        await supabase
          .from("matches")
          .upsert(
            matchData,
            {
              onConflict:
                "external_id",
            }
          )
          .select(`
            id,
            external_id,
            league,
            league_logo,
            home_team,
            away_team,
            home_logo,
            away_logo,
            match_date,
            status,
            home_score,
            away_score,
            created_at,
            updated_at
          `)
          .single();
    } else {
      result =
        await supabase
          .from("matches")
          .insert(
            matchData
          )
          .select(`
            id,
            external_id,
            league,
            league_logo,
            home_team,
            away_team,
            home_logo,
            away_logo,
            match_date,
            status,
            home_score,
            away_score,
            created_at,
            updated_at
          `)
          .single();
    }

    if (result.error) {
      return NextResponse.json(
        {
          success: false,

          error:
            result.error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,

        match:
          result.data,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Matches POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Maç kaydedilirken sunucu hatası oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getMatches,
  getMatch,
} from "../../../lib/football-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

function normalizeMatch(match) {
  const externalId =
    match.url ||
    `${match.home}-${match.away}-${match.time}`;

  let status = "scheduled";

  if (match.status === "live") {
    status = "live";
  } else if (match.status === "finished") {
    status = "finished";
  } else if (match.status === "postponed") {
    status = "postponed";
  } else if (match.status === "cancelled") {
    status = "cancelled";
  }

  const parsedDate = new Date(match.time);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return {
    external_id: String(externalId),

    league: match.competition
      ? String(match.competition)
      : null,

    league_logo:
      match.competition_logo || null,

    home_team: match.home
      ? String(match.home).trim()
      : null,

    away_team: match.away
      ? String(match.away).trim()
      : null,

    home_logo:
      match.home_logo || null,

    away_logo:
      match.away_logo || null,

    match_date:
      parsedDate.toISOString(),

    status,
  };
}

export async function GET(request) {
  try {
    const supabase = getSupabase();

    const { searchParams } =
      new URL(request.url);

    const matchId =
      searchParams.get("id");

    const status =
      searchParams.get("status");

    const limitParam = Number(
      searchParams.get("limit") || 50
    );

    const limit = Math.min(
      Math.max(limitParam, 1),
      100
    );

    /*
     * GEÇİCİ DEBUG
     *
     * Bir maç ID'si ile istek geldiğinde
     * Supabase'deki external_id içinden
     * SportScore slug'ını çıkarıp gerçek
     * maç detayını getiriyoruz.
     *
     * Şimdilik sadece response içine
     * sportScoreDebug alanı ekliyoruz.
     */
    let sportScoreDebug = null;

    if (matchId) {
      const {
        data: debugMatch,
        error: debugMatchError,
      } = await supabase
        .from("matches")
        .select(
          "id, external_id, home_team, away_team"
        )
        .eq("id", matchId)
        .maybeSingle();

      if (debugMatchError) {
        console.error(
          "Debug match lookup error:",
          debugMatchError
        );
      } else if (debugMatch) {
        const externalId =
          debugMatch.external_id || "";

        const slug =
          externalId
            .replace(/^\/football\/match\//, "")
            .replace(/\/$/, "");

        console.log(
          "SPORTSCORE DEBUG - external_id:",
          externalId
        );

        console.log(
          "SPORTSCORE DEBUG - slug:",
          slug
        );

        if (slug) {
          try {
            const detail =
              await getMatch(slug);

            console.log(
              "SPORTSCORE DEBUG - full response:",
              JSON.stringify(
                detail,
                null,
                2
              )
            );

            console.log(
              "SPORTSCORE DEBUG - score:",
              JSON.stringify(
                detail?.score,
                null,
                2
              )
            );

            sportScoreDebug = {
              slug,
              score: detail?.score ?? null,
              status: detail?.status ?? null,
              detail,
            };
          } catch (debugError) {
            console.error(
              "SportScore debug request error:",
              debugError
            );

            sportScoreDebug = {
              slug,
              error:
                debugError?.message ||
                "SportScore detay isteği başarısız.",
            };
          }
        }
      }
    }

    const sportScoreData =
      await getMatches(
        Math.min(limit, 50)
      );

    const sportScoreMatches =
      Array.isArray(
        sportScoreData?.matches
      )
        ? sportScoreData.matches
        : [];

    const normalizedMatches =
      sportScoreMatches
        .map(normalizeMatch)
        .filter(Boolean)
        .filter(
          (match) =>
            match.external_id &&
            match.home_team &&
            match.away_team &&
            match.match_date
        );

    if (normalizedMatches.length > 0) {
      const {
        error: upsertError,
      } = await supabase
        .from("matches")
        .upsert(
          normalizedMatches,
          {
            onConflict:
              "external_id",
          }
        );

      if (upsertError) {
        console.error(
          "SportScore matches upsert error:",
          upsertError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              upsertError.message,
          },
          {
            status: 500,
          }
        );
      }
    }

    let query = supabase
      .from("matches")
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
      .order("match_date", {
        ascending: true,
      })
      .limit(limit);

    if (matchId) {
      query =
        query.eq(
          "id",
          matchId
        );
    }

    if (status) {
      query =
        query.eq(
          "status",
          status
        );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(
        "Matches GET error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      matches: data || [],
      source: "SportScore",
      sportScoreDebug,
    });
  } catch (error) {
    console.error(
      "Matches GET server error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Maçlar alınırken bir sunucu hatası oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request) {
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

    const validStatuses = [
      "scheduled",
      "live",
      "finished",
      "postponed",
      "cancelled",
    ];

    if (
      !validStatuses.includes(status)
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
        String(home_team).trim(),

      away_team:
        String(away_team).trim(),

      home_logo:
        home_logo || null,

      away_logo:
        away_logo || null,

      match_date:
        parsedDate.toISOString(),

      status,
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
      console.error(
        "Matches POST error:",
        result.error
      );

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
        match: result.data,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Matches POST server error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Maç kaydedilirken bir sunucu hatası oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}
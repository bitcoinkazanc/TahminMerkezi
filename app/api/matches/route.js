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

function addSourceDataToMatches(
  databaseMatches,
  sourceMatches
) {
  const sourceMap =
    new Map();

  sourceMatches.forEach(
    (sourceMatch) => {
      if (
        !sourceMatch?.id
      ) {
        return;
      }

      sourceMap.set(
        String(
          sourceMatch.id
        ),
        sourceMatch
      );
    }
  );

  return databaseMatches.map(
    (databaseMatch) => {
      const sourceMatch =
        sourceMap.get(
          String(
            databaseMatch.external_id
          )
        );

      if (!sourceMatch) {
        return {
          ...databaseMatch,
          sport:
            "football",
        };
      }

      return {
        ...databaseMatch,

        sport:
          getSourceSport(
            sourceMatch
          ),

        home_logo:
          sourceMatch.home_logo ||
          databaseMatch.home_logo ||
          null,

        away_logo:
          sourceMatch.away_logo ||
          databaseMatch.away_logo ||
          null,

        live_minute:
          sourceMatch.live_minute ||
          null,

        source:
          "Mackolik",

        source_id:
          sourceMatch.id,

        source_status:
          sourceMatch.source_status ||
          null,

        source_state:
          sourceMatch.source_state ||
          null,

        source_substate:
          sourceMatch.source_substate ||
          null,

        status_box_content:
          sourceMatch.status_box_content ||
          null,

        home_team_id:
          sourceMatch.home_team_id ||
          null,

        away_team_id:
          sourceMatch.away_team_id ||
          null,
      };
    }
  );
}

export async function GET(
  request
) {
  try {
    const supabase =
      getSupabase();

    const { searchParams } =
      new URL(request.url);

    const matchId =
      searchParams.get("id");

    const requestedStatus =
      searchParams.get(
        "status"
      );

    const requestedSport =
      searchParams.get(
        "sport"
      );

    const sourceMatches =
      await getMatches();

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
          data:
            databaseMatch,
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

    const normalizedMatches =
      filteredSourceMatches
        .map(
          normalizeMatch
        )
        .filter(Boolean);

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

    let matches =
      addSourceDataToMatches(
        databaseMatches,
        filteredSourceMatches
      );

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
            matches =
              matches.map(
                (item) => ({
                  ...item,

                  live_minute:
                    detail.live_minute ||
                    item.live_minute ||
                    null,

                  home_logo:
                    detail.home_logo ||
                    item.home_logo ||
                    null,

                  away_logo:
                    detail.away_logo ||
                    item.away_logo ||
                    null,

                  home_score:
                    detail.home_score !==
                      null &&
                    detail.home_score !==
                      undefined
                      ? detail.home_score
                      : item.home_score,

                  away_score:
                    detail.away_score !==
                      null &&
                    detail.away_score !==
                      undefined
                      ? detail.away_score
                      : item.away_score,
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
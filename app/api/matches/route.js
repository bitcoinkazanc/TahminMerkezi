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
    !match.home ||
    !match.away ||
    !match.time ||
    !match.url
  ) {
    return null;
  }

  const parsedDate =
    new Date(match.time);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return null;
  }

  return {
    external_id:
      String(match.url),

    league:
      match.competition || null,

    league_logo:
      match.competition_logo || null,

    home_team:
      String(match.home).trim(),

    away_team:
      String(match.away).trim(),

    home_logo:
      match.home_logo || null,

    away_logo:
      match.away_logo || null,

    match_date:
      parsedDate.toISOString(),

    status:
      match.status || "scheduled",

    home_score:
      toScore(match.home_score),

    away_score:
      toScore(match.away_score),
  };
}

function getSlugFromMatchUrl(matchUrl) {
  if (!matchUrl) {
    return null;
  }

  const parts =
    String(matchUrl)
      .split("/")
      .filter(Boolean);

  return parts.length > 0
    ? parts[parts.length - 1]
    : null;
}

async function getLiveMinute(
  match
) {
  if (
    !match ||
    match.status !== "live" ||
    !match.url
  ) {
    return null;
  }

  const slug =
    getSlugFromMatchUrl(
      match.url
    );

  if (!slug) {
    return null;
  }

  try {
    const detail =
      await getMatch(slug);

    const liveMinute =
      detail?.match?.live_minute;

    if (
      liveMinute === undefined ||
      liveMinute === null ||
      liveMinute === ""
    ) {
      return null;
    }

    return String(liveMinute);
  } catch (error) {
    console.error(
      "Live minute loading error:",
      error
    );

    return null;
  }
}

export async function GET(request) {
  try {
    const supabase =
      getSupabase();

    const { searchParams } =
      new URL(request.url);

    const matchId =
      searchParams.get("id");

    const status =
      searchParams.get("status");

    const requestedLimit =
      Number(
        searchParams.get("limit") || 50
      );

    const limit =
      Math.min(
        Math.max(
          requestedLimit,
          1
        ),
        50
      );

    const sportScoreData =
      await getMatches(limit);

    const sourceMatches =
      Array.isArray(
        sportScoreData?.matches
      )
        ? sportScoreData.matches
        : [];

    const normalizedMatches =
      sourceMatches
        .map(normalizeMatch)
        .filter(Boolean);

    if (
      normalizedMatches.length > 0
    ) {
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
          "Matches upsert error:",
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

    let query =
      supabase
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
        .order(
          "match_date",
          {
            ascending: false,
          }
        )
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
        "Matches select error:",
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

    let matches =
      data || [];

    if (matchId && matches.length > 0) {
      const currentMatch =
        matches[0];

      if (
        currentMatch.status ===
        "live"
      ) {
        const sourceMatch =
          sourceMatches.find(
            (item) =>
              String(
                item?.url || ""
              ) ===
              String(
                currentMatch.external_id ||
                  ""
              )
          );

        if (sourceMatch) {
          const liveMinute =
            await getLiveMinute(
              sourceMatch
            );

          matches =
            matches.map(
              (item) => ({
                ...item,
                live_minute:
                  liveMinute,
              })
            );
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        matches,
        source:
          "SportScore",
        source_count:
          sourceMatches.length,
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
          "Maçlar alınırken hata oluştu.",
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
        toScore(home_score),

      away_score:
        toScore(away_score),
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
          "Maç kaydedilirken hata oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}
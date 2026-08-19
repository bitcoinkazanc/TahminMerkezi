import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMatches } from "../../../lib/football-api";

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

function getValue(object, paths) {
  for (const path of paths) {
    const parts = path.split(".");
    let value = object;

    for (const part of parts) {
      if (
        value === null ||
        value === undefined
      ) {
        break;
      }

      value = value[part];
    }

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
}

function normalizeMatch(match) {
  const externalId = getValue(match, [
    "id",
    "match_id",
    "external_id",
    "slug",
  ]);

  const homeTeam = getValue(match, [
    "home_team",
    "homeTeam",
    "home.name",
    "home.team.name",
    "homeTeam.name",
  ]);

  const awayTeam = getValue(match, [
    "away_team",
    "awayTeam",
    "away.name",
    "away.team.name",
    "awayTeam.name",
  ]);

  const matchDate = getValue(match, [
    "match_date",
    "matchDate",
    "start_time",
    "startTime",
    "date",
    "start_at",
    "startAt",
  ]);

  const league = getValue(match, [
    "league",
    "league.name",
    "league_name",
    "competition.name",
    "tournament.name",
  ]);

  const leagueLogo = getValue(match, [
    "league_logo",
    "league.logo",
    "competition.logo",
    "tournament.logo",
  ]);

  const homeLogo = getValue(match, [
    "home_logo",
    "home.logo",
    "home.team.logo",
    "homeTeam.logo",
  ]);

  const awayLogo = getValue(match, [
    "away_logo",
    "away.logo",
    "away.team.logo",
    "awayTeam.logo",
  ]);

  const rawStatus = String(
    getValue(match, [
      "status",
      "match_status",
      "state",
    ]) || ""
  ).toLowerCase();

  let status = "scheduled";

  if (
    rawStatus.includes("live") ||
    rawStatus.includes("inplay") ||
    rawStatus.includes("in-play")
  ) {
    status = "live";
  } else if (
    rawStatus.includes("finish") ||
    rawStatus.includes("ended") ||
    rawStatus.includes("completed")
  ) {
    status = "finished";
  } else if (
    rawStatus.includes("postpon")
  ) {
    status = "postponed";
  } else if (
    rawStatus.includes("cancel")
  ) {
    status = "cancelled";
  }

  let parsedDate = null;

  if (matchDate) {
    const date = new Date(matchDate);

    if (!Number.isNaN(date.getTime())) {
      parsedDate = date.toISOString();
    }
  }

  return {
    external_id: externalId
      ? String(externalId)
      : null,

    league: league
      ? String(league)
      : null,

    league_logo: leagueLogo || null,

    home_team: homeTeam
      ? String(homeTeam).trim()
      : null,

    away_team: awayTeam
      ? String(awayTeam).trim()
      : null,

    home_logo: homeLogo || null,

    away_logo: awayLogo || null,

    match_date: parsedDate,

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
     * 1. SportScore'dan maçları al.
     */
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

    /*
     * 2. SportScore verilerini
     * Supabase formatına dönüştür.
     */
    const normalizedMatches =
      sportScoreMatches
        .map(normalizeMatch)
        .filter(
          (match) =>
            match.external_id &&
            match.home_team &&
            match.away_team &&
            match.match_date
        );

    /*
     * 3. Supabase'e kaydet veya güncelle.
     */
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
      }
    }

    /*
     * 4. Supabase'den maçları getir.
     */
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
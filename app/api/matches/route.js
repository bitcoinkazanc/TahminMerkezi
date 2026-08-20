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
      String(externalId),

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

    home_score:
      match.home_score !== undefined &&
      match.home_score !== null
        ? Number(match.home_score)
        : null,

    away_score:
      match.away_score !== undefined &&
      match.away_score !== null
        ? Number(match.away_score)
        : null,
  };
}

function getMatchSlug(externalId) {
  if (!externalId) {
    return null;
  }

  const value =
    String(externalId).trim();

  const match =
    value.match(
      /\/football\/match\/([^/]+)\/?/
    );

  return match?.[1] || null;
}

async function addMatchDetails(matches) {
  const detailedMatches = [];

  for (const match of matches) {
    try {
      const slug =
        getMatchSlug(
          match.external_id
        );

      if (!slug) {
        detailedMatches.push(match);
        continue;
      }

      const detail =
        await getMatch(slug);

      const detailMatch =
        detail?.match;

      if (!detailMatch) {
        detailedMatches.push(match);
        continue;
      }

      const homeScore =
        detailMatch.home_score;

      const awayScore =
        detailMatch.away_score;

      const validHomeScore =
        homeScore !== undefined &&
        homeScore !== null &&
        homeScore !== "" &&
        Number.isFinite(
          Number(homeScore)
        );

      const validAwayScore =
        awayScore !== undefined &&
        awayScore !== null &&
        awayScore !== "" &&
        Number.isFinite(
          Number(awayScore)
        );

      let status =
        match.status;

      if (
        detailMatch.status === "live"
      ) {
        status = "live";
      } else if (
        detailMatch.status === "finished"
      ) {
        status = "finished";
      } else if (
        detailMatch.status === "postponed"
      ) {
        status = "postponed";
      } else if (
        detailMatch.status === "cancelled"
      ) {
        status = "cancelled";
      } else if (
        detailMatch.status === "scheduled"
      ) {
        status = "scheduled";
      }

      detailedMatches.push({
        ...match,

        status,

        home_score:
          validHomeScore
            ? Number(homeScore)
            : match.home_score,

        away_score:
          validAwayScore
            ? Number(awayScore)
            : match.away_score,
      });
    } catch (error) {
      console.error(
        "SportScore match detail error:",
        match.external_id,
        error
      );

      detailedMatches.push(match);
    }
  }

  return detailedMatches;
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

    const limitParam = Number(
      searchParams.get("limit") || 50
    );

    const limit = Math.min(
      Math.max(limitParam, 1),
      100
    );

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

    const detailedMatches =
      await addMatchDetails(
        normalizedMatches
      );

    if (
      detailedMatches.length > 0
    ) {
      const {
        error: upsertError,
      } = await supabase
        .from("matches")
        .upsert(
          detailedMatches,
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
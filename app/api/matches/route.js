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

    const sport =
      searchParams.get("sport");

    const limitParam =
      searchParams.get("limit");

    const requestedLimit =
      limitParam
        ? Number(limitParam)
        : null;

    const limit =
      requestedLimit !== null &&
      Number.isFinite(
        requestedLimit
      ) &&
      requestedLimit > 0
        ? Math.floor(
            requestedLimit
          )
        : null;

    const sourceMatches =
      await getMatches();

    const filteredSourceMatches =
      sourceMatches.filter(
        (match) => {
          if (
            sport &&
            match?.sport !==
              sport
          ) {
            return false;
          }

          if (
            status &&
            match?.status !==
              status
          ) {
            return false;
          }

          if (
            matchId &&
            String(
              match?.id
            ) !==
              String(matchId)
          ) {
            return false;
          }

          return true;
        }
      );

    const normalizedMatches =
      filteredSourceMatches
        .map(normalizeMatch)
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

    if (
      uniqueMatches.length > 0
    ) {
      const {
        error: upsertError,
      } = await supabase
        .from("matches")
        .upsert(
          uniqueMatches,
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

    const sourceExternalIds =
      filteredSourceMatches
        .map(
          (match) =>
            String(match.id)
        )
        .filter(Boolean);

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
            ascending: true,
          }
        );

    if (
      sourceExternalIds.length > 0
    ) {
      query =
        query.in(
          "external_id",
          sourceExternalIds
        );
    } else {
      query =
        query.in(
          "external_id",
          ["__no_matches__"]
        );
    }

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

    if (limit !== null) {
      query =
        query.limit(limit);
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

    const sourceSportMap =
      new Map();

    filteredSourceMatches.forEach(
      (sourceMatch) => {
        if (!sourceMatch?.id) {
          return;
        }

        sourceSportMap.set(
          String(
            sourceMatch.id
          ),
          getSourceSport(
            sourceMatch
          )
        );
      }
    );

    matches =
      matches.map(
        (match) => ({
          ...match,

          sport:
            sourceSportMap.get(
              String(
                match.external_id
              )
            ) ||
            "football",
        })
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
          "Maç kaydedilirken hata oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}
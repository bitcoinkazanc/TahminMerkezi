import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getMatches,
  getSearchMatches,
  getMatch,
} from "../../../lib/football-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function getMatchTimestamp(match) {
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const candidates = [
    match.match_date,
    match.matchDate,
    match.date,
    match.start_time,
    match.startTime,
  ];

  for (const value of candidates) {
    if (!value) {
      continue;
    }

    const timestamp =
      new Date(value).getTime();

    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  return Number.MAX_SAFE_INTEGER;
}

function getLiveMinute(match) {
  if (!match) {
    return null;
  }

  const candidates = [
    match.live_minute,
    match.liveMinute,
    match.minute,
    match.currentMinute,
    match.current_minute,
  ];

  for (const value of candidates) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue;
    }

    const numeric =
      Number(value);

    if (
      Number.isFinite(numeric) &&
      numeric >= 0 &&
      numeric <= 200
    ) {
      return Math.floor(numeric);
    }
  }

  return null;
}

function isLiveMatch(match) {
  if (!match) {
    return false;
  }

  const status =
    normalizeText(match.status);

  const state =
    normalizeText(match.state);

  return (
    status === "live" ||
    status === "canlı" ||
    status === "inplay" ||
    status === "in-play" ||
    state === "live" ||
    state === "canlı" ||
    state === "inplay" ||
    state === "in-play"
  );
}

function isFinishedMatch(match) {
  if (!match) {
    return false;
  }

  const status =
    normalizeText(match.status);

  const state =
    normalizeText(match.state);

  return (
    status === "finished" ||
    status === "completed" ||
    status === "fulltime" ||
    status === "full-time" ||
    status === "ended" ||
    status === "bitmiş" ||
    status === "bitti" ||
    state === "finished" ||
    state === "completed" ||
    state === "fulltime" ||
    state === "full-time" ||
    state === "ended" ||
    state === "bitmiş" ||
    state === "bitti"
  );
}

function isTurkishLeague(match) {
  if (!match) {
    return false;
  }

  const league =
    normalizeText(match.league);

  const leagueId =
    normalizeText(match.league_id);

  const competitionId =
    normalizeText(match.competition_id);

  const country =
    normalizeText(
      match.country ||
        match.country_name ||
        match.league_country
    );

  if (
    league.includes("türkiye") ||
    league.includes("turkiye") ||
    league.includes("turkey") ||
    country.includes("türkiye") ||
    country.includes("turkiye") ||
    country.includes("turkey")
  ) {
    return true;
  }

  const turkishLeagueKeywords = [
    "süper lig",
    "super lig",
    "1. lig",
    "1 lig",
    "2. lig",
    "2 lig",
    "3. lig",
    "3 lig",
    "tff",
    "zıraat",
    "ziraat",
    "türkiye kupası",
    "turkiye kupasi",
    "türkiye süper kupası",
    "turkiye super kupasi",
  ];

  if (
    turkishLeagueKeywords.some(
      (keyword) =>
        league.includes(keyword)
    )
  ) {
    return true;
  }

  if (
    leagueId === "turkey" ||
    competitionId === "turkey"
  ) {
    return true;
  }

  return false;
}

function sortMatches(matches) {
  if (!Array.isArray(matches)) {
    return [];
  }

  return [...matches].sort(
    (a, b) => {
      const aLive =
        isLiveMatch(a);

      const bLive =
        isLiveMatch(b);

      const aFinished =
        isFinishedMatch(a);

      const bFinished =
        isFinishedMatch(b);

      if (aLive && !bLive) {
        return -1;
      }

      if (!aLive && bLive) {
        return 1;
      }

      if (aLive && bLive) {
        const aTurkish =
          isTurkishLeague(a);

        const bTurkish =
          isTurkishLeague(b);

        if (
          aTurkish &&
          !bTurkish
        ) {
          return -1;
        }

        if (
          !aTurkish &&
          bTurkish
        ) {
          return 1;
        }

        const aMinute =
          getLiveMinute(a);

        const bMinute =
          getLiveMinute(b);

        if (
          aMinute !== null &&
          bMinute !== null &&
          aMinute !== bMinute
        ) {
          return bMinute - aMinute;
        }

        if (
          aMinute !== null &&
          bMinute === null
        ) {
          return -1;
        }

        if (
          aMinute === null &&
          bMinute !== null
        ) {
          return 1;
        }

        return (
          getMatchTimestamp(a) -
          getMatchTimestamp(b)
        );
      }

      if (
        aFinished &&
        !bFinished
      ) {
        return 1;
      }

      if (
        !aFinished &&
        bFinished
      ) {
        return -1;
      }

      if (
        aFinished &&
        bFinished
      ) {
        return (
          getMatchTimestamp(b) -
          getMatchTimestamp(a)
        );
      }

      return (
        getMatchTimestamp(a) -
        getMatchTimestamp(b)
      );
    }
  );
}

async function attachSupabaseIds(
  matches,
  supabase
) {
  if (
    !supabase ||
    !Array.isArray(matches) ||
    matches.length === 0
  ) {
    return matches;
  }

  const externalIds =
    matches
      .map(
        (match) =>
          match?.external_id
      )
      .filter(Boolean);

  if (externalIds.length === 0) {
    return matches;
  }

  const {
    data: databaseMatches,
    error: databaseError,
  } =
    await supabase
      .from("matches")
      .select(
        "id, external_id"
      )
      .in(
        "external_id",
        externalIds
      );

  if (databaseError) {
    console.error(
      "Supabase ID eşleştirme hatası:",
      databaseError
    );

    return matches;
  }

  const idMap =
    new Map();

  for (
    const databaseMatch of
      databaseMatches || []
  ) {
    if (
      databaseMatch?.external_id &&
      databaseMatch?.id
    ) {
      idMap.set(
        String(
          databaseMatch.external_id
        ),
        databaseMatch.id
      );
    }
  }

  return matches.map(
    (match) => {
      const supabaseId =
        idMap.get(
          String(
            match.external_id
          )
        );

      if (!supabaseId) {
        return match;
      }

      return {
        ...match,
        id: supabaseId,
        external_id:
          match.external_id,
      };
    }
  );
}

export async function GET(request) {
  const startedAt =
    Date.now();

  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

    const requestedId =
      searchParams.get("id");

    const sport =
      searchParams.get("sport");

    const status =
      searchParams.get("status");

    const search =
      searchParams.get("search");

    if (requestedId) {
      const supabase =
        getSupabaseAdmin();

      if (supabase) {
        const {
          data: supabaseMatch,
          error: supabaseError,
        } =
          await supabase
            .from("matches")
            .select("*")
            .or(
              `id.eq.${requestedId},external_id.eq.${requestedId}`
            )
            .maybeSingle();

        if (supabaseError) {
          console.error(
            "Supabase maç arama hatası:",
            supabaseError
          );
        }

        if (supabaseMatch) {
          let freshMatch =
            null;

          if (
            supabaseMatch.external_id
          ) {
            try {
              freshMatch =
                await getMatch(
                  supabaseMatch.external_id
                );
            } catch (error) {
              console.error(
                "Mackolik güncel maç alınamadı:",
                error
              );
            }
          }

          if (freshMatch) {
            return NextResponse.json(
              {
                success: true,
                source:
                  "Mackolik+Supabase",
                match: {
                  ...freshMatch,
                  id:
                    supabaseMatch.id,
                  external_id:
                    supabaseMatch.external_id,
                  created_at:
                    supabaseMatch.created_at,
                  updated_at:
                    supabaseMatch.updated_at,
                },
                duration_ms:
                  Date.now() -
                  startedAt,
              },
              {
                headers: {
                  "Cache-Control":
                    "no-store, no-cache, must-revalidate, proxy-revalidate",
                  Pragma: "no-cache",
                  Expires: "0",
                },
              }
            );
          }

          return NextResponse.json(
            {
              success: true,
              source:
                "Supabase",
              match:
                supabaseMatch,
              duration_ms:
                Date.now() -
                startedAt,
            },
            {
              headers: {
                "Cache-Control":
                  "no-store, no-cache, must-revalidate, proxy-revalidate",
                Pragma: "no-cache",
                Expires: "0",
              },
            }
          );
        }
      }

      const match =
        await getMatch(
          requestedId
        );

      if (!match) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Maç bulunamadı.",
            source:
              "Mackolik",
            duration_ms:
              Date.now() -
              startedAt,
          },
          {
            status: 404,
            headers: {
              "Cache-Control":
                "no-store, no-cache, must-revalidate, proxy-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );
      }

      return NextResponse.json(
        {
          success: true,
          source:
            "Mackolik",
          match,
          duration_ms:
            Date.now() -
            startedAt,
        },
        {
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    let allMatches;

    if (
      search &&
      search.trim()
    ) {
      allMatches =
        await getSearchMatches();
    } else {
      allMatches =
        await getMatches();
    }

    if (
      !Array.isArray(allMatches)
    ) {
      allMatches = [];
    }

    let matches =
      allMatches;

    const supabase =
      getSupabaseAdmin();

    matches =
      await attachSupabaseIds(
        matches,
        supabase
      );

    if (sport) {
      const wantedSport =
        normalizeText(
          sport
        );

      matches =
        matches.filter(
          (match) =>
            normalizeText(
              match.sport
            ) === wantedSport
        );
    }

    if (status) {
      const wantedStatus =
        normalizeText(
          status
        );

      matches =
        matches.filter(
          (match) =>
            normalizeText(
              match.status
            ) === wantedStatus
        );
    }

    if (
      search &&
      search.trim()
    ) {
      const searchText =
        normalizeText(
          search
        );

      matches =
        matches.filter(
          (match) => {
            const homeTeam =
              normalizeText(
                match?.home_team
              );

            const awayTeam =
              normalizeText(
                match?.away_team
              );

            const league =
              normalizeText(
                match?.league
              );

            return (
              homeTeam.includes(
                searchText
              ) ||
              awayTeam.includes(
                searchText
              ) ||
              league.includes(
                searchText
              )
            );
          }
        );
    }

    matches =
      sortMatches(
        matches
      );

    return NextResponse.json(
      {
        success: true,
        source:
          search &&
          search.trim()
            ? "Mackolik+Supabase+Search"
            : "Mackolik+Supabase",
        count:
          matches.length,
        matches,
        duration_ms:
          Date.now() -
          startedAt,
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
      "MACKOLIK /api/matches HATASI",
      error
    );

    return NextResponse.json(
      {
        success: false,
        source:
          "Mackolik",
        error:
          error?.message ||
          "Maç verileri alınamadı.",
        error_name:
          error?.name ||
          null,
        duration_ms:
          Date.now() -
          startedAt,
      },
      {
        status: 500,
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
  }
}
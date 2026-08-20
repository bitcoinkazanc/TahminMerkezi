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

function getFirstHalfScoreFromIncidents(
  incidents,
  finalHomeScore,
  finalAwayScore
) {
  if (!Array.isArray(incidents)) {
    return null;
  }

  let firstHalfHome = 0;
  let firstHalfAway = 0;

  for (const incident of incidents) {
    const minute =
      Number(incident?.time);

    if (
      !Number.isFinite(minute) ||
      minute > 45
    ) {
      continue;
    }

    if (
      incident?.is_goal !== true
    ) {
      continue;
    }

    if (
      Number.isFinite(
        Number(
          incident?.home_score
        )
      ) &&
      Number.isFinite(
        Number(
          incident?.away_score
        )
      )
    ) {
      firstHalfHome =
        Number(
          incident.home_score
        );

      firstHalfAway =
        Number(
          incident.away_score
        );
    } else if (
      incident?.side === "home"
    ) {
      firstHalfHome += 1;
    } else if (
      incident?.side === "away"
    ) {
      firstHalfAway += 1;
    }
  }

  const totalFirstHalf =
    firstHalfHome +
    firstHalfAway;

  const totalFinal =
    finalHomeScore +
    finalAwayScore;

  if (
    totalFirstHalf >
    totalFinal
  ) {
    return null;
  }

  return {
    home: firstHalfHome,
    away: firstHalfAway,
  };
}

function getPredictionCorrectness(
  prediction,
  match,
  detail
) {
  const homeScore =
    Number(match.home_score);

  const awayScore =
    Number(match.away_score);

  if (
    !Number.isFinite(homeScore) ||
    !Number.isFinite(awayScore)
  ) {
    return null;
  }

  const totalGoals =
    homeScore + awayScore;

  let matchResult;

  if (homeScore > awayScore) {
    matchResult = "MS1";
  } else if (
    homeScore === awayScore
  ) {
    matchResult = "MSX";
  } else {
    matchResult = "MS2";
  }

  const code =
    String(
      prediction || ""
    );

  if (
    [
      "MS1",
      "MSX",
      "MS2",
    ].includes(code)
  ) {
    return code === matchResult;
  }

  if (
    [
      "DC1X",
      "DC12",
      "DCX2",
    ].includes(code)
  ) {
    if (code === "DC1X") {
      return (
        homeScore >= awayScore
      );
    }

    if (code === "DC12") {
      return (
        homeScore !== awayScore
      );
    }

    return (
      awayScore >= homeScore
    );
  }

  const overUnderMap = {
    U05: 0.5,
    O05: 0.5,
    U15: 1.5,
    O15: 1.5,
    U25: 2.5,
    O25: 2.5,
    U35: 3.5,
    O35: 3.5,
    U45: 4.5,
    O45: 4.5,
  };

  if (
    Object.prototype.hasOwnProperty.call(
      overUnderMap,
      code
    )
  ) {
    const line =
      overUnderMap[code];

    if (code.startsWith("U")) {
      return totalGoals < line;
    }

    return totalGoals > line;
  }

  if (
    [
      "ODD",
      "EVEN",
    ].includes(code)
  ) {
    if (code === "ODD") {
      return (
        totalGoals % 2 === 1
      );
    }

    return (
      totalGoals % 2 === 0
    );
  }

  if (
    [
      "GOAL_RANGE_0_1",
      "GOAL_RANGE_2_3",
      "GOAL_RANGE_4_5",
      "GOAL_RANGE_6_PLUS",
    ].includes(code)
  ) {
    if (
      code ===
      "GOAL_RANGE_0_1"
    ) {
      return (
        totalGoals >= 0 &&
        totalGoals <= 1
      );
    }

    if (
      code ===
      "GOAL_RANGE_2_3"
    ) {
      return (
        totalGoals >= 2 &&
        totalGoals <= 3
      );
    }

    if (
      code ===
      "GOAL_RANGE_4_5"
    ) {
      return (
        totalGoals >= 4 &&
        totalGoals <= 5
      );
    }

    return totalGoals >= 6;
  }

  if (
    [
      "BTTS_YES",
      "BTTS_NO",
    ].includes(code)
  ) {
    const bothScored =
      homeScore > 0 &&
      awayScore > 0;

    if (code === "BTTS_YES") {
      return bothScored;
    }

    return !bothScored;
  }

  const firstHalfScore =
    getFirstHalfScoreFromIncidents(
      detail?.match?.incidents,
      homeScore,
      awayScore
    );

  if (
    [
      "HT1",
      "HTX",
      "HT2",
      "HTU05",
      "HTO05",
      "HTU15",
      "HTO15",
      "HTU25",
      "HTO25",
      "HTDC1X",
      "HTDC12",
      "HTDCX2",
      "MOST_GOALS_1H",
      "MOST_GOALS_EQUAL",
      "MOST_GOALS_2H",
    ].includes(code)
  ) {
    if (!firstHalfScore) {
      return null;
    }

    const htHome =
      firstHalfScore.home;

    const htAway =
      firstHalfScore.away;

    const htTotal =
      htHome + htAway;

    if (code === "HT1") {
      return htHome > htAway;
    }

    if (code === "HTX") {
      return htHome === htAway;
    }

    if (code === "HT2") {
      return htAway > htHome;
    }

    if (code === "HTU05") {
      return htTotal < 0.5;
    }

    if (code === "HTO05") {
      return htTotal > 0.5;
    }

    if (code === "HTU15") {
      return htTotal < 1.5;
    }

    if (code === "HTO15") {
      return htTotal > 1.5;
    }

    if (code === "HTU25") {
      return htTotal < 2.5;
    }

    if (code === "HTO25") {
      return htTotal > 2.5;
    }

    if (code === "HTDC1X") {
      return htHome >= htAway;
    }

    if (code === "HTDC12") {
      return htHome !== htAway;
    }

    if (code === "HTDCX2") {
      return htAway >= htHome;
    }

    const secondHalfHome =
      homeScore - htHome;

    const secondHalfAway =
      awayScore - htAway;

    const firstHalfGoals =
      htTotal;

    const secondHalfGoals =
      secondHalfHome +
      secondHalfAway;

    if (code === "MOST_GOALS_1H") {
      return (
        firstHalfGoals >
        secondHalfGoals
      );
    }

    if (
      code === "MOST_GOALS_EQUAL"
    ) {
      return (
        firstHalfGoals ===
        secondHalfGoals
      );
    }

    if (code === "MOST_GOALS_2H") {
      return (
        secondHalfGoals >
        firstHalfGoals
      );
    }
  }

  if (
    [
      "2H1",
      "2HX",
      "2H2",
    ].includes(code)
  ) {
    if (!firstHalfScore) {
      return null;
    }

    const secondHalfHome =
      homeScore -
      firstHalfScore.home;

    const secondHalfAway =
      awayScore -
      firstHalfScore.away;

    if (code === "2H1") {
      return (
        secondHalfHome >
        secondHalfAway
      );
    }

    if (code === "2HX") {
      return (
        secondHalfHome ===
        secondHalfAway
      );
    }

    return (
      secondHalfAway >
      secondHalfHome
    );
  }

  if (
    [
      "FIRST_GOAL_HOME",
      "FIRST_GOAL_NONE",
      "FIRST_GOAL_AWAY",
    ].includes(code)
  ) {
    const incidents =
      detail?.match?.incidents;

    if (!Array.isArray(incidents)) {
      return null;
    }

    const goalIncidents =
      incidents
        .filter(
          (incident) =>
            incident?.is_goal === true &&
            [
              "home",
              "away",
            ].includes(
              incident?.side
            )
        )
        .sort(
          (a, b) =>
            Number(a?.time || 0) -
            Number(b?.time || 0)
        );

    if (
      goalIncidents.length === 0
    ) {
      return (
        code ===
        "FIRST_GOAL_NONE"
      );
    }

    const firstGoal =
      goalIncidents[0];

    if (
      code ===
      "FIRST_GOAL_HOME"
    ) {
      return (
        firstGoal.side === "home"
      );
    }

    if (
      code ===
      "FIRST_GOAL_AWAY"
    ) {
      return (
        firstGoal.side === "away"
      );
    }

    return false;
  }

  return null;
}

async function evaluateFinishedMatch(
  supabase,
  match
) {
  if (
    !match ||
    match.status !== "finished"
  ) {
    return;
  }

  if (
    match.home_score === null ||
    match.away_score === null
  ) {
    return;
  }

  const {
    data: predictions,
    error: predictionsError,
  } = await supabase
    .from("predictions")
    .select(`
      id,
      prediction,
      result,
      points
    `)
    .eq("match_id", match.id)
    .eq("result", "pending");

  if (predictionsError) {
    console.error(
      "Finished match predictions lookup error:",
      predictionsError
    );

    return;
  }

  if (
    !predictions ||
    predictions.length === 0
  ) {
    return;
  }

  let detail = null;

  const slug =
    getSlugFromMatchUrl(
      match.external_id
    );

  if (slug) {
    try {
      detail =
        await getMatch(slug);
    } catch (error) {
      console.error(
        "Finished match detail loading error:",
        error
      );
    }
  }

  for (const prediction of predictions) {
    const correctness =
      getPredictionCorrectness(
        prediction.prediction,
        match,
        detail
      );

    if (
      correctness === null
    ) {
      continue;
    }

    const result =
      correctness
        ? "correct"
        : "wrong";

    const points =
      correctness
        ? 10
        : 0;

    const {
      error: updateError,
    } = await supabase
      .from("predictions")
      .update({
        result,
        points,
      })
      .eq("id", prediction.id)
      .eq("result", "pending");

    if (updateError) {
      console.error(
        "Prediction result update error:",
        updateError
      );
    }
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

    for (const match of matches) {
      if (
        match.status ===
        "finished"
      ) {
        await evaluateFinishedMatch(
          supabase,
          match
        );
      }
    }

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
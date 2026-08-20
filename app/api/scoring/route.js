import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMatch } from "../../../lib/football-api";

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

function isAuthorized(request) {
  const cronSecret =
    process.env.CRON_SECRET;

  const authHeader =
    request.headers.get(
      "authorization"
    );

  if (
    !cronSecret ||
    !authHeader
  ) {
    return false;
  }

  return (
    authHeader ===
    `Bearer ${cronSecret}`
  );
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

function predictionNeedsDetail(
  prediction
) {
  return [
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
    "2H1",
    "2HX",
    "2H2",
    "FIRST_GOAL_HOME",
    "FIRST_GOAL_NONE",
    "FIRST_GOAL_AWAY",
    "MOST_GOALS_1H",
    "MOST_GOALS_EQUAL",
    "MOST_GOALS_2H",
  ].includes(prediction);
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
      return homeScore >= awayScore;
    }

    if (code === "DC12") {
      return homeScore !== awayScore;
    }

    return awayScore >= homeScore;
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
    code === "ODD" ||
    code === "EVEN"
  ) {
    if (code === "ODD") {
      return totalGoals % 2 === 1;
    }

    return totalGoals % 2 === 0;
  }

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

  if (
    code ===
    "GOAL_RANGE_6_PLUS"
  ) {
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

    if (
      code ===
      "MOST_GOALS_1H"
    ) {
      return (
        firstHalfGoals >
        secondHalfGoals
      );
    }

    if (
      code ===
      "MOST_GOALS_EQUAL"
    ) {
      return (
        firstHalfGoals ===
        secondHalfGoals
      );
    }

    if (
      code ===
      "MOST_GOALS_2H"
    ) {
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

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const supabase =
      getSupabase();

    /*
     * Önce bütün pending tahminleri
     * tek sorguda alıyoruz.
     */
    const {
      data: pendingPredictions,
      error: predictionsError,
    } = await supabase
      .from("predictions")
      .select(`
        id,
        match_id,
        prediction,
        result,
        points
      `)
      .eq(
        "result",
        "pending"
      );

    if (predictionsError) {
      console.error(
        "Pending predictions lookup error:",
        predictionsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            predictionsError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      !pendingPredictions ||
      pendingPredictions.length === 0
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Puanlanacak bekleyen tahmin bulunamadı.",
        finishedMatches: 0,
        pendingPredictions: 0,
        processedMatches: 0,
        processedPredictions: 0,
        correctPredictions: 0,
        wrongPredictions: 0,
      });
    }

    /*
     * Pending tahminlerin bulunduğu
     * benzersiz maç ID'lerini çıkarıyoruz.
     */
    const matchIds =
      [
        ...new Set(
          pendingPredictions
            .map(
              (prediction) =>
                prediction.match_id
            )
            .filter(Boolean)
        ),
      ];

    if (matchIds.length === 0) {
      return NextResponse.json({
        success: true,
        message:
          "Tahminlerde geçerli maç bulunamadı.",
        finishedMatches: 0,
        pendingPredictions:
          pendingPredictions.length,
        processedMatches: 0,
        processedPredictions: 0,
        correctPredictions: 0,
        wrongPredictions: 0,
      });
    }

    /*
     * Sadece bu tahminlere ait maçları
     * tek sorguda alıyoruz.
     */
    const {
      data: matches,
      error: matchesError,
    } = await supabase
      .from("matches")
      .select(`
        id,
        external_id,
        status,
        home_score,
        away_score
      `)
      .in(
        "id",
        matchIds
      )
      .eq(
        "status",
        "finished"
      );

    if (matchesError) {
      console.error(
        "Finished matches lookup error:",
        matchesError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            matchesError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      !matches ||
      matches.length === 0
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Bekleyen tahminlere ait bitmiş maç bulunamadı.",
        finishedMatches: 0,
        pendingPredictions:
          pendingPredictions.length,
        processedMatches: 0,
        processedPredictions: 0,
        correctPredictions: 0,
        wrongPredictions: 0,
      });
    }

    const matchMap =
      new Map(
        matches.map(
          (match) => [
            String(match.id),
            match,
          ]
        )
      );

    /*
     * Tahminleri maçlara göre gruplayalım.
     */
    const predictionsByMatch =
      new Map();

    for (
      const prediction of
        pendingPredictions
    ) {
      const key =
        String(
          prediction.match_id
        );

      if (
        !predictionsByMatch.has(
          key
        )
      ) {
        predictionsByMatch.set(
          key,
          []
        );
      }

      predictionsByMatch
        .get(key)
        .push(prediction);
    }

    const correctIds = [];
    const wrongIds = [];

    let processedMatches = 0;
    let pendingWithoutResult = 0;

    /*
     * Sadece pending tahmini bulunan
     * finished maçları işliyoruz.
     */
    for (
      const match of matches
    ) {
      const predictions =
        predictionsByMatch.get(
          String(match.id)
        ) || [];

      if (
        predictions.length === 0
      ) {
        continue;
      }

      if (
        match.home_score === null ||
        match.home_score === undefined ||
        match.away_score === null ||
        match.away_score === undefined
      ) {
        continue;
      }

      processedMatches += 1;

      const needsDetail =
        predictions.some(
          (item) =>
            predictionNeedsDetail(
              item.prediction
            )
        );

      let detail = null;

      if (needsDetail) {
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
              "Match detail loading error:",
              {
                matchId: match.id,
                externalId:
                  match.external_id,
                error,
              }
            );
          }
        }
      }

      for (
        const prediction of
          predictions
      ) {
        const correctness =
          getPredictionCorrectness(
            prediction.prediction,
            match,
            detail
          );

        if (
          correctness === null
        ) {
          pendingWithoutResult += 1;
          continue;
        }

        if (correctness) {
          correctIds.push(
            prediction.id
          );
        } else {
          wrongIds.push(
            prediction.id
          );
        }
      }
    }

    /*
     * Doğru tahminleri toplu güncelle.
     */
    if (
      correctIds.length > 0
    ) {
      const {
        error: correctError,
      } = await supabase
        .from("predictions")
        .update({
          result: "correct",
          points: 10,
        })
        .in(
          "id",
          correctIds
        )
        .eq(
          "result",
          "pending"
        );

      if (correctError) {
        console.error(
          "Correct predictions update error:",
          correctError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              correctError.message,
          },
          {
            status: 500,
          }
        );
      }
    }

    /*
     * Yanlış tahminleri toplu güncelle.
     */
    if (
      wrongIds.length > 0
    ) {
      const {
        error: wrongError,
      } = await supabase
        .from("predictions")
        .update({
          result: "wrong",
          points: 0,
        })
        .in(
          "id",
          wrongIds
        )
        .eq(
          "result",
          "pending"
        );

      if (wrongError) {
        console.error(
          "Wrong predictions update error:",
          wrongError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              wrongError.message,
          },
          {
            status: 500
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "Puanlama işlemi tamamlandı.",
      finishedMatches:
        matches.length,
      pendingPredictions:
        pendingPredictions.length,
      processedMatches,
      processedPredictions:
        correctIds.length +
        wrongIds.length,
      correctPredictions:
        correctIds.length,
      wrongPredictions:
        wrongIds.length,
      pendingWithoutResult,
    });
  } catch (error) {
    console.error(
      "Scoring GET server error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Puanlama sırasında sunucu hatası oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}
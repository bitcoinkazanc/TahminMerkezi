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
    request.headers.get("authorization");

  if (!cronSecret || !authHeader) {
    return false;
  }

  return (
    authHeader ===
    `Bearer ${cronSecret}`
  );
}

/*
 * Mackolik external_id bazen doğrudan ID,
 * bazen URL/slug olabilir.
 */
function getSlugFromMatchUrl(matchUrl) {
  if (!matchUrl) {
    return null;
  }

  const value = String(matchUrl).trim();

  if (!value) {
    return null;
  }

  /*
   * UUID / numeric / doğrudan Mackolik ID
   * ise olduğu gibi kullan.
   */
  if (!value.includes("/")) {
    return value;
  }

  const parts =
    value
      .split("/")
      .filter(Boolean);

  return parts.length > 0
    ? parts[parts.length - 1]
    : value;
}

/*
 * --------------------------------------------------
 * MAÇ DURUMU
 * --------------------------------------------------
 */

function normalizeFreshMatchStatus(match) {
  if (!match) {
    return null;
  }

  const state =
    String(
      match.state || ""
    ).toLowerCase();

  const status =
    String(
      match.status || ""
    ).toLowerCase();

  const substate =
    String(
      match.substate || ""
    ).toLowerCase();

  /*
   * Kesin bitmiş durumlar.
   */
  if (
    state === "finished" ||
    state === "completed" ||
    state === "complete" ||
    state === "ended" ||
    state === "final" ||
    status === "finished" ||
    status === "completed" ||
    status === "fulltime" ||
    status === "full_time" ||
    status === "final" ||
    substate === "finished" ||
    substate === "completed" ||
    substate === "fulltime"
  ) {
    return "finished";
  }

  /*
   * İptal / ertelenmiş maçlar bitmiş kabul edilmez.
   */
  if (
    state === "cancelled" ||
    state === "canceled" ||
    state === "postponed" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "postponed"
  ) {
    return state === "postponed" ||
      status === "postponed"
      ? "postponed"
      : "cancelled";
  }

  /*
   * Canlı.
   */
  if (
    state === "live" ||
    status === "live"
  ) {
    return "live";
  }

  /*
   * Devre arası canlı maçtır.
   */
  if (
    state === "halftime" ||
    substate === "halftime" ||
    substate === "halfTime".toLowerCase()
  ) {
    return "live";
  }

  return "scheduled";
}

function getNumericScore(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
}

/*
 * --------------------------------------------------
 * İLK YARI SKORU
 * --------------------------------------------------
 */

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
      Number(
        incident?.time
      );

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

    const incidentHomeScore =
      Number(
        incident?.home_score
      );

    const incidentAwayScore =
      Number(
        incident?.away_score
      );

    if (
      Number.isFinite(
        incidentHomeScore
      ) &&
      Number.isFinite(
        incidentAwayScore
      )
    ) {
      firstHalfHome =
        incidentHomeScore;

      firstHalfAway =
        incidentAwayScore;
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

  /*
   * İlk yarı skoru final skordan büyük
   * olamaz. Veri hatalıysa sonuç üretme.
   */
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

/*
 * --------------------------------------------------
 * DETAY GEREKTİREN TAHMİNLER
 * --------------------------------------------------
 */

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
  ].includes(
    String(
      prediction || ""
    ).trim()
  );
}

/*
 * --------------------------------------------------
 * TAHMİN SONUCU
 * --------------------------------------------------
 */

function getPredictionCorrectness(
  prediction,
  match,
  detail
) {
  const homeScore =
    getNumericScore(
      match.home_score
    );

  const awayScore =
    getNumericScore(
      match.away_score
    );

  /*
   * Final skor olmadan sonuç üretme.
   */
  if (
    homeScore === null ||
    awayScore === null
  ) {
    return null;
  }

  const totalGoals =
    homeScore +
    awayScore;

  let matchResult;

  if (
    homeScore >
    awayScore
  ) {
    matchResult = "MS1";
  } else if (
    homeScore ===
    awayScore
  ) {
    matchResult = "MSX";
  } else {
    matchResult = "MS2";
  }

  const code =
    String(
      prediction || ""
    ).trim();

  /*
   * MS1 / MSX / MS2
   */
  if (
    [
      "MS1",
      "MSX",
      "MS2",
    ].includes(code)
  ) {
    return (
      code ===
      matchResult
    );
  }

  /*
   * Çifte şans.
   */
  if (
    [
      "DC1X",
      "DC12",
      "DCX2",
    ].includes(code)
  ) {
    if (
      code === "DC1X"
    ) {
      return (
        homeScore >=
        awayScore
      );
    }

    if (
      code === "DC12"
    ) {
      return (
        homeScore !==
        awayScore
      );
    }

    return (
      awayScore >=
      homeScore
    );
  }

  /*
   * Alt / Üst.
   */
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

    if (
      code.startsWith("U")
    ) {
      return (
        totalGoals <
        line
      );
    }

    return (
      totalGoals >
      line
    );
  }

  /*
   * Tek / Çift.
   */
  if (
    code === "ODD" ||
    code === "EVEN"
  ) {
    if (
      code === "ODD"
    ) {
      return (
        totalGoals % 2 === 1
      );
    }

    return (
      totalGoals % 2 === 0
    );
  }

  /*
   * Gol aralıkları.
   */
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
    return (
      totalGoals >= 6
    );
  }

  /*
   * KG Var / Yok.
   */
  if (
    [
      "BTTS_YES",
      "BTTS_NO",
    ].includes(code)
  ) {
    const bothScored =
      homeScore > 0 &&
      awayScore > 0;

    if (
      code ===
      "BTTS_YES"
    ) {
      return bothScored;
    }

    return !bothScored;
  }

  /*
   * Detay isteyen tahminlerde
   * Mackolik maç detayına ihtiyaç var.
   */
  const firstHalfScore =
    getFirstHalfScoreFromIncidents(
      detail?.match?.incidents,
      homeScore,
      awayScore
    );

  /*
   * İlk yarı tahminleri.
   */
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
    if (
      !firstHalfScore
    ) {
      return null;
    }

    const htHome =
      firstHalfScore.home;

    const htAway =
      firstHalfScore.away;

    const htTotal =
      htHome +
      htAway;

    if (
      code === "HT1"
    ) {
      return (
        htHome >
        htAway
      );
    }

    if (
      code === "HTX"
    ) {
      return (
        htHome ===
        htAway
      );
    }

    if (
      code === "HT2"
    ) {
      return (
        htAway >
        htHome
      );
    }

    if (
      code === "HTU05"
    ) {
      return (
        htTotal < 0.5
      );
    }

    if (
      code === "HTO05"
    ) {
      return (
        htTotal > 0.5
      );
    }

    if (
      code === "HTU15"
    ) {
      return (
        htTotal < 1.5
      );
    }

    if (
      code === "HTO15"
    ) {
      return (
        htTotal > 1.5
      );
    }

    if (
      code === "HTU25"
    ) {
      return (
        htTotal < 2.5
      );
    }

    if (
      code === "HTO25"
    ) {
      return (
        htTotal > 2.5
      );
    }

    if (
      code === "HTDC1X"
    ) {
      return (
        htHome >=
        htAway
      );
    }

    if (
      code === "HTDC12"
    ) {
      return (
        htHome !==
        htAway
      );
    }

    if (
      code === "HTDCX2"
    ) {
      return (
        htAway >=
        htHome
      );
    }

    const secondHalfHome =
      homeScore -
      htHome;

    const secondHalfAway =
      awayScore -
      htAway;

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

  /*
   * İkinci yarı sonucu.
   */
  if (
    [
      "2H1",
      "2HX",
      "2H2",
    ].includes(code)
  ) {
    if (
      !firstHalfScore
    ) {
      return null;
    }

    const secondHalfHome =
      homeScore -
      firstHalfScore.home;

    const secondHalfAway =
      awayScore -
      firstHalfScore.away;

    if (
      code === "2H1"
    ) {
      return (
        secondHalfHome >
        secondHalfAway
      );
    }

    if (
      code === "2HX"
    ) {
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

  /*
   * İlk gol.
   */
  if (
    [
      "FIRST_GOAL_HOME",
      "FIRST_GOAL_NONE",
      "FIRST_GOAL_AWAY",
    ].includes(code)
  ) {
    const incidents =
      detail?.match?.incidents;

    if (
      !Array.isArray(
        incidents
      )
    ) {
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
            Number(
              a?.time || 0
            ) -
            Number(
              b?.time || 0
            )
        );

    /*
     * Maçta hiç gol yoksa
     * FIRST_GOAL_NONE doğrudur.
     */
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
        firstGoal.side ===
        "home"
      );
    }

    if (
      code ===
      "FIRST_GOAL_AWAY"
    ) {
      return (
        firstGoal.side ===
        "away"
      );
    }

    return false;
  }

  /*
   * Tanınmayan tahmin kodu.
   * Yanlış kabul etmiyoruz.
   */
  return null;
}

/*
 * --------------------------------------------------
 * MACKOLIK'TEN MAÇI YENİLE
 * --------------------------------------------------
 *
 * Kritik düzeltme:
 *
 * Supabase'deki status'a körü körüne
 * güvenmiyoruz.
 *
 * Pending tahmin varsa maçın güncel
 * durumunu Mackolik'ten tekrar çekiyoruz.
 */
async function refreshMatchFromMackolik(
  supabase,
  databaseMatch
) {
  if (!databaseMatch) {
    return {
      match: databaseMatch,
      fresh: null,
      refreshed: false,
      finished: false,
    };
  }

  const externalId =
    databaseMatch.external_id;

  if (!externalId) {
    return {
      match: databaseMatch,
      fresh: null,
      refreshed: false,
      finished:
        String(
          databaseMatch.status ||
            ""
        ).toLowerCase() ===
        "finished",
    };
  }

  let fresh = null;

  try {
    const lookupId =
      getSlugFromMatchUrl(
        externalId
      );

    fresh =
      await getMatch(
        lookupId
      );
  } catch (error) {
    console.error(
      "Mackolik maç yenileme hatası:",
      {
        matchId:
          databaseMatch.id,
        externalId,
        error:
          error?.message ||
          error,
      }
    );
  }

  if (!fresh) {
    /*
     * Mackolik erişilemezse mevcut
     * Supabase durumunu kullan.
     *
     * Ancak sadece zaten finished ise.
     */
    return {
      match: databaseMatch,
      fresh: null,
      refreshed: false,
      finished:
        String(
          databaseMatch.status ||
            ""
        ).toLowerCase() ===
        "finished",
    };
  }

  const freshStatus =
    normalizeFreshMatchStatus(
      fresh
    );

  const freshHomeScore =
    getNumericScore(
      fresh.home_score
    );

  const freshAwayScore =
    getNumericScore(
      fresh.away_score
    );

  /*
   * Mackolik'ten alınan güncel skorları
   * Supabase'e yaz.
   */
  const updateData = {
    status:
      freshStatus ||
      databaseMatch.status,

    updated_at:
      new Date().toISOString(),
  };

  if (
    freshHomeScore !== null
  ) {
    updateData.home_score =
      freshHomeScore;
  }

  if (
    freshAwayScore !== null
  ) {
    updateData.away_score =
      freshAwayScore;
  }

  /*
   * Sadece gerçekten değişen/güncellenen
   * maç bilgisini DB'ye yazıyoruz.
   */
  const {
    error: updateError,
  } = await supabase
    .from("matches")
    .update(updateData)
    .eq(
      "id",
      databaseMatch.id
    );

  if (updateError) {
    console.error(
      "Maç Supabase güncelleme hatası:",
      {
        matchId:
          databaseMatch.id,
        error:
          updateError,
      }
    );
  }

  const refreshedMatch = {
    ...databaseMatch,
    ...updateData,
  };

  return {
    match:
      refreshedMatch,
    fresh,
    refreshed: true,
    finished:
      freshStatus ===
      "finished",
  };
}

/*
 * --------------------------------------------------
 * GET
 * --------------------------------------------------
 */

export async function GET(
  request
) {
  if (
    !isAuthorized(
      request
    )
  ) {
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
     * Bütün pending tahminleri al.
     */
    const {
      data:
        pendingPredictions,
      error:
        predictionsError,
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

    if (
      predictionsError
    ) {
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
      pendingPredictions.length ===
        0
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

        pendingWithoutResult: 0,

        refreshedMatches: 0,
      });
    }

    /*
     * Benzersiz maç ID'leri.
     */
    const matchIds = [
      ...new Set(
        pendingPredictions
          .map(
            (prediction) =>
              prediction.match_id
          )
          .filter(Boolean)
      ),
    ];

    if (
      matchIds.length ===
      0
    ) {
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

        pendingWithoutResult: 0,

        refreshedMatches: 0,
      });
    }

    /*
     * KRİTİK DEĞİŞİKLİK:
     *
     * Artık sadece status=finished
     * olan maçları çekmiyoruz.
     *
     * Pending tahmini olan bütün maçları
     * çekiyoruz.
     *
     * Böylece Supabase'de yanlışlıkla
     * live/scheduled kalmış ama Mackolik'te
     * bitmiş maçları da yenileyebiliyoruz.
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
      );

    if (
      matchesError
    ) {
      console.error(
        "Matches lookup error:",
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
      matches.length ===
        0
    ) {
      return NextResponse.json({
        success: true,

        message:
          "Bekleyen tahminlere ait maç bulunamadı.",

        finishedMatches: 0,

        pendingPredictions:
          pendingPredictions.length,

        processedMatches: 0,

        processedPredictions: 0,

        correctPredictions: 0,

        wrongPredictions: 0,

        pendingWithoutResult:
          pendingPredictions.length,

        refreshedMatches: 0,
      });
    }

    /*
     * Tahminleri maçlara göre grupla.
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
        .push(
          prediction
        );
    }

    const correctIds = [];
    const wrongIds = [];

    let processedMatches = 0;

    let pendingWithoutResult =
      0;

    let refreshedMatches = 0;

    let finishedMatches = 0;

    /*
     * Her maçın güncel durumunu Mackolik'ten
     * kontrol et.
     */
    for (
      const databaseMatch of
        matches
    ) {
      const predictions =
        predictionsByMatch.get(
          String(
            databaseMatch.id
          )
        ) || [];

      if (
        predictions.length ===
        0
      ) {
        continue;
      }

      /*
       * Maçı Mackolik'ten yenile.
       */
      const refreshResult =
        await refreshMatchFromMackolik(
          supabase,
          databaseMatch
        );

      if (
        refreshResult.refreshed
      ) {
        refreshedMatches +=
          1;
      }

      const match =
        refreshResult.match;

      /*
       * Mackolik kesin olarak bitmiş
       * diyorsa puanlama yapılabilir.
       *
       * Supabase'de daha önce finished ise
       * de kabul edilir.
       */
      const databaseFinished =
        String(
          databaseMatch.status ||
            ""
        ).toLowerCase() ===
        "finished";

      const matchFinished =
        refreshResult.finished ||
        databaseFinished;

      if (
        !matchFinished
      ) {
        /*
         * Canlı / başlamamış / ertelenmiş
         * maçlara kesinlikle puan verme.
         */
        pendingWithoutResult +=
          predictions.length;

        continue;
      }

      const homeScore =
        getNumericScore(
          match.home_score
        );

      const awayScore =
        getNumericScore(
          match.away_score
        );

      /*
       * Maç bitmiş görünse bile final skor
       * yoksa puanlama yapma.
       */
      if (
        homeScore === null ||
        awayScore === null
      ) {
        pendingWithoutResult +=
          predictions.length;

        continue;
      }

      processedMatches += 1;

      finishedMatches += 1;

      /*
       * Detay gerektiren tahmin var mı?
       */
      const needsDetail =
        predictions.some(
          (item) =>
            predictionNeedsDetail(
              item.prediction
            )
        );

      let detail = null;

      /*
       * İlk yarı / ilk gol gibi tahminler
       * için detay al.
       *
       * getMatch() sonucunu zaten
       * refreshMatchFromMackolik()
       * içerisinde aldık.
       */
      if (
        needsDetail &&
        refreshResult.fresh
      ) {
        detail =
          refreshResult.fresh;
      }

      /*
       * Eğer refresh sırasında detay
       * gelmediyse tekrar dene.
       */
      if (
        needsDetail &&
        !detail
      ) {
        const slug =
          getSlugFromMatchUrl(
            match.external_id
          );

        if (slug) {
          try {
            detail =
              await getMatch(
                slug
              );
          } catch (error) {
            console.error(
              "Match detail loading error:",
              {
                matchId:
                  match.id,

                externalId:
                  match.external_id,

                error:
                  error?.message ||
                  error,
              }
            );
          }
        }
      }

      /*
       * Her pending tahmini puanla.
       */
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

        /*
         * Tanınmayan / detay eksik
         * tahmini yanlış kabul ETME.
         *
         * Pending bırak.
         */
        if (
          correctness ===
          null
        ) {
          pendingWithoutResult +=
            1;

          continue;
        }

        if (
          correctness
        ) {
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
     * --------------------------------------------------
     * DOĞRU TAHMİNLER
     * --------------------------------------------------
     */

    if (
      correctIds.length >
      0
    ) {
      const {
        error:
          correctError,
      } = await supabase
        .from("predictions")
        .update({
          result:
            "correct",

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

      if (
        correctError
      ) {
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
     * --------------------------------------------------
     * YANLIŞ TAHMİNLER
     * --------------------------------------------------
     */

    if (
      wrongIds.length >
      0
    ) {
      const {
        error:
          wrongError,
      } = await supabase
        .from("predictions")
        .update({
          result:
            "wrong",

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

      if (
        wrongError
      ) {
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
            status: 500,
          }
        );
      }
    }

    /*
     * --------------------------------------------------
     * SONUÇ
     * --------------------------------------------------
     */

    return NextResponse.json({
      success: true,

      message:
        "Puanlama işlemi tamamlandı.",

      totalMatches:
        matches.length,

      finishedMatches,

      refreshedMatches,

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
  } catch (
    error
  ) {
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
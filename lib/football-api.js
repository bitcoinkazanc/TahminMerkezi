const MACKOLIK_BASE_URL =
  "https://www.mackolik.com";

const MACKOLIK_LIVESCORES_PATH =
  "/perform/p0/ajax/components/competition/livescores/json";

function formatDate(date = new Date()) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function mackolikRequest(
  sport,
  date = new Date()
) {
  const matchDate =
    formatDate(date);

  const url =
    new URL(
      `${MACKOLIK_BASE_URL}${MACKOLIK_LIVESCORES_PATH}`
    );

  url.searchParams.set(
    "matchDate",
    matchDate
  );

  url.searchParams.append(
    "sports[]",
    sport
  );

  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",

        headers: {
          Accept:
            "application/json, text/plain, */*",

          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",

          Referer:
            "https://www.mackolik.com/",

          Origin:
            "https://www.mackolik.com",
        },

        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `Maçkolik ${sport} API hatası: ${response.status}`
    );
  }

  const data =
    await response.json();

  if (
    !data ||
    data.status !== "success"
  ) {
    throw new Error(
      `Maçkolik ${sport} başarısız cevap döndürdü.`
    );
  }

  return data;
}

function normalizeMatch(
  match,
  competitions,
  sport
) {
  if (!match) {
    return null;
  }

  const competition =
    competitions?.[
      match?.competitionId
    ] || null;

  const score =
    match?.score || {};

  const homeScore =
    score?.home;

  const awayScore =
    score?.away;

  let status =
    "scheduled";

  if (
    match?.state === "live"
  ) {
    status = "live";
  } else if (
    match?.state === "post"
  ) {
    if (
      match?.substate ===
      "postponed"
    ) {
      status = "postponed";
    } else {
      status = "finished";
    }
  } else if (
    match?.state === "pre"
  ) {
    status = "scheduled";
  }

  let matchDate = null;

  if (
    match?.mstUtc !==
      undefined &&
    match?.mstUtc !== null &&
    match?.mstUtc !== ""
  ) {
    const timestamp =
      Number(
        match.mstUtc
      );

    if (
      Number.isFinite(
        timestamp
      )
    ) {
      matchDate =
        new Date(
          timestamp
        ).toISOString();
    }
  }

  return {
    id:
      match?.id ||
      null,

    sport,

    home_team:
      match?.homeTeam?.name ||
      "",

    away_team:
      match?.awayTeam?.name ||
      "",

    home_logo:
      match?.homeTeam?.logo ||
      match?.homeTeam?.image ||
      match?.homeTeam?.logoUrl ||
      null,

    away_logo:
      match?.awayTeam?.logo ||
      match?.awayTeam?.image ||
      match?.awayTeam?.logoUrl ||
      null,

    league:
      competition?.name ||
      match?.competition?.name ||
      "Bilinmeyen Lig",

    league_logo:
      competition?.logo ||
      competition?.image ||
      match?.competition?.logo ||
      match?.competition?.image ||
      null,

    match_date:
      matchDate,

    status,

    home_score:
      homeScore === "" ||
      homeScore === null ||
      homeScore === undefined
        ? null
        : Number(
            homeScore
          ),

    away_score:
      awayScore === "" ||
      awayScore === null ||
      awayScore === undefined
        ? null
        : Number(
            awayScore
          ),

    source:
      "mackolik",

    source_id:
      match?.id ||
      null,

    source_status:
      match?.status ||
      null,

    source_state:
      match?.state ||
      null,

    source_substate:
      match?.substate ||
      null,

    status_box_content:
      match?.statusBoxContent ||
      null,

    last_updated:
      match?.lastUpdated ||
      null,

    live_betting:
      match?.liveBetting === true,

    competition_id:
      match?.competitionId ||
      null,

    iddaa_code:
      match?.iddaaCode ||
      null,

    half_time_home_score:
      score?.ht?.home ===
        undefined ||
      score?.ht?.home ===
        null ||
      score?.ht?.home === ""
        ? null
        : Number(
            score.ht.home
          ),

    half_time_away_score:
      score?.ht?.away ===
        undefined ||
      score?.ht?.away ===
        null ||
      score?.ht?.away === ""
        ? null
        : Number(
            score.ht.away
          ),
  };
}

function normalizeMatches(
  data,
  sport
) {
  const rawMatches =
    data?.data?.matches ||
    {};

  let matches = [];

  if (
    Array.isArray(
      rawMatches
    )
  ) {
    matches =
      rawMatches;
  } else if (
    rawMatches &&
    typeof rawMatches ===
      "object"
  ) {
    matches =
      Object.values(
        rawMatches
      );
  }

  const competitions =
    data?.data?.competitions ||
    {};

  return matches
    .map(
      (match) =>
        normalizeMatch(
          match,
          competitions,
          sport
        )
    )
    .filter(
      (match) =>
        match &&
        match.id &&
        match.home_team &&
        match.away_team
    );
}

async function getSportMatches(
  sport
) {
  try {
    const data =
      await mackolikRequest(
        sport
      );

    return normalizeMatches(
      data,
      sport === "Soccer"
        ? "football"
        : "basketball"
    );
  } catch (error) {
    console.error(
      `Maçkolik ${sport} veri alma hatası:`,
      error
    );

    return [];
  }
}

export async function getMatches() {
  const [
    footballMatches,
    basketballMatches,
  ] = await Promise.all([
    getSportMatches(
      "Soccer"
    ),

    getSportMatches(
      "Basketball"
    ),
  ]);

  const matches = [
    ...footballMatches,
    ...basketballMatches,
  ];

  if (
    matches.length === 0
  ) {
    throw new Error(
      "Maçkolik'ten futbol veya basketbol maçı alınamadı."
    );
  }

  return matches;
}

export async function getFootballMatches() {
  return getSportMatches(
    "Soccer"
  );
}

export async function getBasketballMatches() {
  return getSportMatches(
    "Basketball"
  );
}

export async function getMatch(
  id
) {
  if (!id) {
    throw new Error(
      "Maç ID bilgisi gerekli."
    );
  }

  const [
    footballMatches,
    basketballMatches,
  ] = await Promise.all([
    getSportMatches(
      "Soccer"
    ),

    getSportMatches(
      "Basketball"
    ),
  ]);

  return [
    ...footballMatches,
    ...basketballMatches,
  ].find(
    (match) =>
      String(
        match?.id
      ) ===
      String(id)
  ) || null;
}

export default {
  getMatches,
  getFootballMatches,
  getBasketballMatches,
  getMatch,
};
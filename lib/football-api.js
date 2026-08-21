const MACKOLIK_BASE_URL =
  "https://www.mackolik.com";

const MACKOLIK_LIVESCORES_PATH =
  "/perform/p0/ajax/components/competition/livescores/json";

function formatDate(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value;

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
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
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
      `Maçkolik API hatası: ${response.status}`
    );
  }

  const data =
    await response.json();

  if (
    data?.status !==
    "success"
  ) {
    throw new Error(
      "Maçkolik veri kaynağı başarısız cevap döndürdü."
    );
  }

  return data;
}

function normalizeMatch(
  match,
  competitions,
  sport
) {
  const competition =
    competitions?.[
      match?.competitionId
    ];

  const homeScore =
    match?.score?.home;

  const awayScore =
    match?.score?.away;

  let status =
    "scheduled";

  if (
    match?.state ===
    "live"
  ) {
    status = "live";
  } else if (
    match?.state ===
    "post"
  ) {
    if (
      match?.substate ===
      "postponed"
    ) {
      status =
        "postponed";
    } else {
      status =
        "finished";
    }
  } else if (
    match?.state ===
    "pre"
  ) {
    status =
      "scheduled";
  }

  return {
    id:
      match?.id,

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
      null,

    away_logo:
      match?.awayTeam?.logo ||
      match?.awayTeam?.image ||
      null,

    league:
      competition?.name ||
      "Bilinmeyen Lig",

    league_logo:
      competition?.logo ||
      competition?.image ||
      null,

    match_date:
      match?.mstUtc
        ? new Date(
            Number(
              match.mstUtc
            )
          ).toISOString()
        : null,

    status,

    home_score:
      homeScore === "" ||
      homeScore === null ||
      homeScore ===
        undefined
        ? null
        : Number(
            homeScore
          ),

    away_score:
      awayScore === "" ||
      awayScore === null ||
      awayScore ===
        undefined
        ? null
        : Number(
            awayScore
          ),

    source:
      "mackolik",

    source_id:
      match?.id,

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
      match?.liveBetting ===
      true,

    competition_id:
      match?.competitionId ||
      null,

    iddaa_code:
      match?.iddaaCode ||
      null,
  };
}

function normalizeMatches(
  data,
  sport
) {
  const matches =
    Object.values(
      data?.data?.matches ||
        {}
    );

  const competitions =
    data?.data
      ?.competitions ||
    {};

  return matches.map(
    (match) =>
      normalizeMatch(
        match,
        competitions,
        sport
      )
  );
}

export async function getMatches() {
  const [
    footballData,
    basketballData,
  ] = await Promise.all([
    mackolikRequest(
      "Soccer"
    ),
    mackolikRequest(
      "Basketball"
    ),
  ]);

  const footballMatches =
    normalizeMatches(
      footballData,
      "football"
    );

  const basketballMatches =
    normalizeMatches(
      basketballData,
      "basketball"
    );

  return [
    ...footballMatches,
    ...basketballMatches,
  ];
}

export async function getFootballMatches() {
  const data =
    await mackolikRequest(
      "Soccer"
    );

  return normalizeMatches(
    data,
    "football"
  );
}

export async function getBasketballMatches() {
  const data =
    await mackolikRequest(
      "Basketball"
    );

  return normalizeMatches(
    data,
    "basketball"
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
    footballData,
    basketballData,
  ] = await Promise.all([
    mackolikRequest(
      "Soccer"
    ),
    mackolikRequest(
      "Basketball"
    ),
  ]);

  const footballMatches =
    normalizeMatches(
      footballData,
      "football"
    );

  const basketballMatches =
    normalizeMatches(
      basketballData,
      "basketball"
    );

  return [
    ...footballMatches,
    ...basketballMatches,
  ].find(
    (match) =>
      String(
        match.id
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
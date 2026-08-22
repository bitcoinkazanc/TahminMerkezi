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

function firstValue(
  ...values
) {
  for (
    const value of values
  ) {
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

function getTeamId(
  team
) {
  if (!team) {
    return null;
  }

  const id =
    firstValue(
      team.id,
      team.teamId,
      team.teamID,
      team.team_id,
      team.tId,
      team.tid,
      team.team?.id,
      team.team?.teamId,
      team.team?.tId
    );

  if (
    id === null ||
    id === undefined ||
    id === ""
  ) {
    return null;
  }

  return String(id);
}

function normalizeLogo(
  team
) {
  if (!team) {
    return null;
  }

  const directLogo =
    firstValue(
      team.logo,
      team.image,
      team.logoUrl,
      team.logoURL,
      team.imageUrl,
      team.imageURL,
      team.badge,
      team.badgeUrl,
      team.badgeURL,
      team.teamLogo,
      team.teamLogoUrl,
      team.teamLogoURL
    );

  if (
    typeof directLogo ===
      "string" &&
    directLogo.trim()
  ) {
    return directLogo.trim();
  }

  const teamId =
    getTeamId(team);

  if (teamId) {
    return `https://im.mackolik.com/img/logo/buyuk/${teamId}.gif`;
  }

  return null;
}

function extractMinuteFromValue(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value ===
    "number"
  ) {
    if (
      Number.isFinite(
        value
      )
    ) {
      return String(
        Math.floor(value)
      );
    }

    return null;
  }

  if (
    typeof value ===
    "string"
  ) {
    const text =
      value.trim();

    if (!text) {
      return null;
    }

    const minuteWithAdded =
      text.match(
        /(\d{1,3})\s*\+\s*(\d{1,2})/
      );

    if (
      minuteWithAdded
    ) {
      return `${minuteWithAdded[1]}+${minuteWithAdded[2]}`;
    }

    const minuteMatch =
      text.match(
        /(?:^|\s)(\d{1,3})(?:\s*['’′]|\s*(?:dk|dakika|min))/
      );

    if (
      minuteMatch
    ) {
      return minuteMatch[1];
    }

    const plainNumber =
      text.match(
        /^\d{1,3}$/
      );

    if (
      plainNumber
    ) {
      return plainNumber[0];
    }

    return null;
  }

  if (
    typeof value ===
    "object"
  ) {
    return extractMinuteFromValue(
      firstValue(
        value.minute,
        value.minutes,
        value.elapsed,
        value.elapsedMinute,
        value.elapsedMinutes,
        value.currentMinute,
        value.matchMinute,
        value.gameMinute,
        value.value,
        value.text,
        value.label,
        value.content
      )
    );
  }

  return null;
}

function normalizeLiveMinute(
  match
) {
  if (!match) {
    return null;
  }

  const candidates = [
    match.liveMinute,
    match.live_minute,
    match.minute,
    match.minutes,
    match.elapsed,
    match.elapsedMinute,
    match.elapsedMinutes,
    match.currentMinute,
    match.current_minute,
    match.matchMinute,
    match.match_minute,
    match.gameMinute,
    match.game_minute,
    match.statusBoxContent,
    match.status_box_content,
    match.statusContent,
    match.status_content,
  ];

  for (
    const candidate of
    candidates
  ) {
    const minute =
      extractMinuteFromValue(
        candidate
      );

    if (
      minute !== null
    ) {
      return minute;
    }
  }

  return null;
}

function normalizeStatus(
  match
) {
  if (!match) {
    return "scheduled";
  }

  if (
    match?.state ===
    "live"
  ) {
    return "live";
  }

  if (
    match?.state ===
    "post"
  ) {
    if (
      match?.substate ===
      "postponed"
    ) {
      return "postponed";
    }

    if (
      match?.substate ===
      "cancelled"
    ) {
      return "cancelled";
    }

    return "finished";
  }

  if (
    match?.state ===
    "pre"
  ) {
    return "scheduled";
  }

  const rawStatus =
    String(
      firstValue(
        match.status,
        match.statusBoxContent
      ) || ""
    ).toLowerCase();

  if (
    rawStatus.includes(
      "postpon"
    ) ||
    rawStatus.includes(
      "ertel"
    )
  ) {
    return "postponed";
  }

  if (
    rawStatus.includes(
      "cancel"
    ) ||
    rawStatus.includes(
      "iptal"
    )
  ) {
    return "cancelled";
  }

  if (
    rawStatus.includes(
      "live"
    ) ||
    rawStatus.includes(
      "canlı"
    ) ||
    rawStatus.includes(
      "canli"
    )
  ) {
    return "live";
  }

  if (
    rawStatus === "ms" ||
    rawStatus.includes(
      "finished"
    ) ||
    rawStatus.includes(
      "full time"
    ) ||
    rawStatus.includes(
      "maç bitti"
    ) ||
    rawStatus.includes(
      "mac bitti"
    )
  ) {
    return "finished";
  }

  return "scheduled";
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

  const status =
    normalizeStatus(
      match
    );

  let matchDate =
    null;

  if (
    match?.mstUtc !==
      undefined &&
    match?.mstUtc !==
      null &&
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

  const homeLogo =
    normalizeLogo(
      match?.homeTeam
    );

  const awayLogo =
    normalizeLogo(
      match?.awayTeam
    );

  const liveMinute =
    status === "live"
      ? normalizeLiveMinute(
          match
        )
      : null;

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
      homeLogo,

    away_logo:
      awayLogo,

    home_team_id:
      getTeamId(
        match?.homeTeam
      ),

    away_team_id:
      getTeamId(
        match?.awayTeam
      ),

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

    live_minute:
      liveMinute,

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
      match?.liveBetting ===
      true,

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
    data?.data
      ?.competitions ||
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
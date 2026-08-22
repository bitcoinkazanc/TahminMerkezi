const MACKOLIK_BASE_URL =
  "https://www.mackolik.com";

const MACKOLIK_LIVE_URL =
  `${MACKOLIK_BASE_URL}/perform/p0/ajax/components/competition/livescores/json`;

const REQUEST_TIMEOUT = 10000;

function getIstanbulDate(offsetDays = 0) {
  const now = new Date(
    Date.now() + offsetDays * 24 * 60 * 60 * 1000
  );

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  return `${year}-${month}-${day}`;
}

function toNumber(value) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function toStringValue(value) {
  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return value.trim();
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return null;
}

function buildLogo(team) {
  if (!team) {
    return null;
  }

  if (
    typeof team.logo === "string" &&
    team.logo.trim()
  ) {
    return team.logo.trim();
  }

  if (
    typeof team.logoUrl === "string" &&
    team.logoUrl.trim()
  ) {
    return team.logoUrl.trim();
  }

  if (
    typeof team.logo_url === "string" &&
    team.logo_url.trim()
  ) {
    return team.logo_url.trim();
  }

  const teamId =
    team.id ??
    team.teamId ??
    team.team_id;

  if (!teamId) {
    return null;
  }

  return `https://im.mackolik.com/img/logo/buyuk/${teamId}.gif`;
}

function getScoreValue(score, side) {
  if (!score) {
    return null;
  }

  return toNumber(score[side]);
}

function getHalfTimeScore(score, side) {
  if (!score) {
    return null;
  }

  const ht =
    score.ht ??
    score.halfTime ??
    score.half_time ??
    null;

  if (!ht) {
    return null;
  }

  return toNumber(ht[side]);
}

function calculateLiveMinute(match) {
  if (!match) {
    return null;
  }

  if (match.state !== "live") {
    return null;
  }

  if (
    match.substate === "halfTime" ||
    match.statusBoxContent === "İY"
  ) {
    return null;
  }

  const directMinute =
    match.liveMinute ??
    match.live_minute ??
    match.minute ??
    match.matchMinute ??
    match.match_minute ??
    null;

  if (directMinute !== null) {
    const numeric = toNumber(directMinute);

    if (
      numeric !== null &&
      numeric >= 0 &&
      numeric <= 150
    ) {
      return Math.floor(numeric);
    }

    const text =
      toStringValue(directMinute);

    if (text) {
      const found =
        text.match(/\d{1,3}/);

      if (found) {
        const minute =
          Number(found[0]);

        if (
          minute >= 0 &&
          minute <= 150
        ) {
          return minute;
        }
      }
    }
  }

  const periodStart =
    toNumber(match.periodStart);

  if (
    periodStart !== null &&
    periodStart > 0
  ) {
    let start = periodStart;

    if (start < 100000000000) {
      start *= 1000;
    }

    const elapsed =
      Date.now() - start;

    if (
      elapsed >= 0 &&
      elapsed < 150 * 60 * 1000
    ) {
      return Math.floor(
        elapsed / 60000
      );
    }
  }

  return null;
}

function normalizeStatus(match) {
  if (!match) {
    return "scheduled";
  }

  if (
    match.state === "live"
  ) {
    return "live";
  }

  if (
    match.state === "finished" ||
    match.state === "completed" ||
    match.status === "finished" ||
    match.status === "fullTime"
  ) {
    return "finished";
  }

  if (
    match.state === "cancelled" ||
    match.state === "canceled"
  ) {
    return "cancelled";
  }

  if (
    match.state === "postponed"
  ) {
    return "postponed";
  }

  return "scheduled";
}

function normalizeMatch(
  match,
  sport,
  competitionMap = {}
) {
  const home =
    match?.homeTeam || {};

  const away =
    match?.awayTeam || {};

  const score =
    match?.score || {};

  const competitionId =
    toStringValue(
      match?.competitionId
    );

  const competition =
    competitionMap[
      competitionId
    ] || null;

  const liveMinute =
    calculateLiveMinute(match);

  return {
    id:
      toStringValue(match?.id),

    external_id:
      toStringValue(match?.id),

    source: "Mackolik",

    source_id:
      toStringValue(match?.id),

    sport,

    league:
      competition?.name ||
      competition?.title ||
      "Mackolik",

    league_id:
      competitionId,

    league_logo:
      competition?.logo ||
      competition?.logoUrl ||
      null,

    home_team:
      toStringValue(home?.name) ||
      "",

    away_team:
      toStringValue(away?.name) ||
      "",

    home_team_id:
      toStringValue(home?.id),

    away_team_id:
      toStringValue(away?.id),

    home_logo:
      buildLogo(home),

    away_logo:
      buildLogo(away),

    match_date:
      match?.mstUtc
        ? new Date(
            Number(match.mstUtc)
          ).toISOString()
        : null,

    status:
      normalizeStatus(match),

    state:
      toStringValue(match?.state),

    substate:
      toStringValue(match?.substate),

    status_box_content:
      toStringValue(
        match?.statusBoxContent
      ),

    live_minute:
      liveMinute,

    home_score:
      getScoreValue(
        score,
        "home"
      ),

    away_score:
      getScoreValue(
        score,
        "away"
      ),

    ht_home_score:
      getHalfTimeScore(
        score,
        "home"
      ),

    ht_away_score:
      getHalfTimeScore(
        score,
        "away"
      ),

    iddaa_code:
      match?.iddaaCode != null
        ? String(match.iddaaCode)
        : null,

    live_betting:
      Boolean(
        match?.liveBetting
      ),

    match_slug:
      toStringValue(
        match?.matchSlug
      ),

    competition_id:
      competitionId,

    raw: match,
  };
}

async function fetchMackolik(
  date,
  sport
) {
  const url = new URL(
    MACKOLIK_LIVE_URL
  );

  url.searchParams.set(
    "matchDate",
    date
  );

  url.searchParams.append(
    "sports[]",
    sport
  );

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT
    );

  try {
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

          signal:
            controller.signal,
        }
      );

    if (!response.ok) {
      throw new Error(
        `Mackolik HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    if (
      data?.status &&
      data.status !== "success"
    ) {
      throw new Error(
        "Mackolik başarısız cevap döndürdü."
      );
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function getMatchesFromResponse(
  data,
  sport
) {
  const matches =
    data?.data?.matches || {};

  if (
    !matches ||
    typeof matches !== "object"
  ) {
    return [];
  }

  const competitionMap = {};

  const competitions =
    data?.data?.competitions;

  if (
    Array.isArray(competitions)
  ) {
    for (const item of competitions) {
      if (!item) {
        continue;
      }

      const id =
        item.id ??
        item.key ??
        item.competitionId;

      if (id != null) {
        competitionMap[
          String(id)
        ] = item;
      }
    }
  }

  return Object.values(matches)
    .filter(Boolean)
    .map((match) =>
      normalizeMatch(
        match,
        sport,
        competitionMap
      )
    );
}

async function fetchDate(
  date
) {
  const [
    footballData,
    basketballData,
  ] = await Promise.all([
    fetchMackolik(
      date,
      "Soccer"
    ),
    fetchMackolik(
      date,
      "Basketball"
    ),
  ]);

  return [
    ...getMatchesFromResponse(
      footballData,
      "football"
    ),
    ...getMatchesFromResponse(
      basketballData,
      "basketball"
    ),
  ];
}

export async function getMatches() {
  const date =
    getIstanbulDate();

  const matches =
    await fetchDate(date);

  return matches;
}

export async function getMatch(
  matchId
) {
  if (!matchId) {
    return null;
  }

  const requestedId =
    String(matchId);

  const dates = [
    getIstanbulDate(),
    getIstanbulDate(-1),
    getIstanbulDate(1),
  ];

  const results =
    await Promise.allSettled(
      dates.map((date) =>
        fetchDate(date)
      )
    );

  for (const result of results) {
    if (
      result.status !== "fulfilled"
    ) {
      continue;
    }

    const found =
      result.value.find(
        (match) =>
          String(match.id) ===
            requestedId ||
          String(
            match.external_id
          ) === requestedId ||
          String(
            match.iddaa_code
          ) === requestedId
      );

    if (found) {
      return found;
    }
  }

  return null;
}

export {
  normalizeMatch,
  getIstanbulDate,
};
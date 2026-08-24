const MACKOLIK_BASE_URL =
  "https://www.mackolik.com";

const MACKOLIK_LIVE_URL =
  `${MACKOLIK_BASE_URL}/perform/p0/ajax/components/competition/livescores/json`;

const MACKOLIK_TEAM_LOGO_URL =
  "https://file.mackolikfeeds.com/teams";

const REQUEST_TIMEOUT = 10000;

/*
 * ==================================================
 * TARİH
 * ==================================================
 */

function getIstanbulDate(offsetDays = 0) {
  const now = new Date(
    Date.now() +
      offsetDays *
        24 *
        60 *
        60 *
        1000
  );

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
    ).formatToParts(now);

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

/*
 * ==================================================
 * DEĞER YARDIMCILARI
 * ==================================================
 */

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
    const number =
      Number(value);

    if (
      Number.isFinite(number)
    ) {
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

/*
 * ==================================================
 * TAKIM LOGOSU
 * ==================================================
 */

function buildLogo(team) {
  if (!team) {
    return null;
  }

  const teamId =
    team.id ??
    team.teamId ??
    team.team_id ??
    null;

  if (!teamId) {
    return null;
  }

  return `${MACKOLIK_TEAM_LOGO_URL}/${encodeURIComponent(
    String(teamId)
  )}`;
}

function getTeamId(team) {
  if (!team) {
    return null;
  }

  return toStringValue(
    team.id ??
      team.teamId ??
      team.team_id
  );
}

/*
 * ==================================================
 * SKOR
 * ==================================================
 */

function getScoreValue(
  score,
  side
) {
  if (!score) {
    return null;
  }

  return toNumber(
    score[side]
  );
}

function getHalfTimeScore(
  score,
  side
) {
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

  return toNumber(
    ht[side]
  );
}

/*
 * ==================================================
 * MAÇ DURUMU YARDIMCILARI
 * ==================================================
 */

function getState(match) {
  return String(
    match?.state || ""
  ).toLowerCase();
}

function getSubstate(match) {
  return String(
    match?.substate || ""
  ).toLowerCase();
}

function getStatusBox(match) {
  return String(
    match?.statusBoxContent || ""
  )
    .trim()
    .toUpperCase();
}

function isPenaltyShootout(match) {
  const substate =
    getSubstate(match);

  const statusBox =
    getStatusBox(match);

  return (
    substate === "penalties" ||
    substate === "penalty" ||
    statusBox === "PEN"
  );
}

function isHalfTime(match) {
  const substate =
    getSubstate(match);

  const statusBox =
    getStatusBox(match);

  return (
    substate === "halftime" ||
    substate === "half_time" ||
    statusBox === "İY" ||
    statusBox === "HT"
  );
}

function isFinished(match) {
  const state =
    getState(match);

  const substate =
    getSubstate(match);

  const status =
    String(
      match?.status || ""
    ).toLowerCase();

  return (
    state === "finished" ||
    state === "completed" ||
    state === "ended" ||
    status === "finished" ||
    status === "fulltime" ||
    status === "completed" ||
    substate === "finished" ||
    substate === "fulltime"
  );
}

function isCancelled(match) {
  const state =
    getState(match);

  const status =
    String(
      match?.status || ""
    ).toLowerCase();

  return (
    state === "cancelled" ||
    state === "canceled" ||
    status === "cancelled" ||
    status === "canceled"
  );
}

function isPostponed(match) {
  const state =
    getState(match);

  const status =
    String(
      match?.status || ""
    ).toLowerCase();

  return (
    state === "postponed" ||
    status === "postponed"
  );
}

/*
 * ==================================================
 * CANLI DAKİKA
 * ==================================================
 */

function parseMinuteText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text =
    String(value).trim();

  if (!text) {
    return null;
  }

  const addedTime =
    text.match(
      /(\d{1,3})\s*\+\s*(\d{1,2})/
    );

  if (addedTime) {
    const base =
      Number(
        addedTime[1]
      );

    const extra =
      Number(
        addedTime[2]
      );

    if (
      base >= 0 &&
      base <= 150 &&
      extra >= 0 &&
      extra <= 30
    ) {
      return base + extra;
    }
  }

  const normal =
    text.match(
      /\b(\d{1,3})\s*['′]?\b/
    );

  if (normal) {
    const minute =
      Number(
        normal[1]
      );

    if (
      minute >= 0 &&
      minute <= 150
    ) {
      return minute;
    }
  }

  return null;
}

function getDirectLiveMinute(
  match
) {
  if (!match) {
    return null;
  }

  const candidates = [
    match.liveMinute,
    match.live_minute,
    match.minute,
    match.matchMinute,
    match.match_minute,
    match.currentMinute,
    match.current_minute,
    match.gameMinute,
    match.game_minute,
    match.elapsedMinute,
    match.elapsed_minute,
    match.elapsed,
  ];

  for (
    const value of candidates
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      continue;
    }

    const numeric =
      toNumber(value);

    if (
      numeric !== null &&
      numeric >= 0 &&
      numeric <= 150
    ) {
      return Math.floor(
        numeric
      );
    }

    const parsed =
      parseMinuteText(value);

    if (
      parsed !== null
    ) {
      return parsed;
    }
  }

  return null;
}

function getStatusBoxMinute(
  match
) {
  if (!match) {
    return null;
  }

  const values = [
    match.statusBoxContent,
    match.status_box_content,
    match.statusBox,
    match.status_box,
  ];

  for (
    const value of values
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      continue;
    }

    const text =
      String(value).trim();

    if (!text) {
      continue;
    }

    const upper =
      text.toUpperCase();

    if (
      upper === "İY" ||
      upper === "HT" ||
      upper === "PEN"
    ) {
      continue;
    }

    const parsed =
      parseMinuteText(text);

    if (
      parsed !== null
    ) {
      return parsed;
    }
  }

  return null;
}

function calculateMinuteFromTimestamp(
  match
) {
  if (!match) {
    return null;
  }

  let start =
    toNumber(
      match.periodStart ??
        match.period_start ??
        match.periodStartTime ??
        match.period_start_time
    );

  if (
    start === null
  ) {
    start =
      toNumber(
        match.mstUtc
      );
  }

  if (
    start === null ||
    start <= 0
  ) {
    return null;
  }

  if (
    start <
    100000000000
  ) {
    start *= 1000;
  }

  const elapsed =
    Date.now() -
    start;

  if (
    elapsed < 0
  ) {
    return null;
  }

  if (
    elapsed >=
    150 * 60 * 1000
  ) {
    return null;
  }

  return Math.floor(
    elapsed / 60000
  );
}

function calculateLiveMinute(
  match
) {
  if (!match) {
    return null;
  }

  if (
    getState(match) !==
    "live"
  ) {
    return null;
  }

  if (
    isHalfTime(match)
  ) {
    return null;
  }

  if (
    isPenaltyShootout(
      match
    )
  ) {
    return null;
  }

  const direct =
    getDirectLiveMinute(
      match
    );

  if (
    direct !== null
  ) {
    return direct;
  }

  const statusMinute =
    getStatusBoxMinute(
      match
    );

  if (
    statusMinute !== null
  ) {
    return statusMinute;
  }

  return calculateMinuteFromTimestamp(
    match
  );
}

/*
 * ==================================================
 * STATUS NORMALIZATION
 * ==================================================
 */

function normalizeStatus(
  match
) {
  if (!match) {
    return "scheduled";
  }

  if (
    isFinished(match)
  ) {
    return "finished";
  }

  if (
    isCancelled(match)
  ) {
    return "cancelled";
  }

  if (
    isPostponed(match)
  ) {
    return "postponed";
  }

  if (
    isPenaltyShootout(
      match
    )
  ) {
    return "penalties";
  }

  if (
    isHalfTime(match)
  ) {
    return "halftime";
  }

  if (
    getState(match) ===
      "live" ||
    String(
      match?.status || ""
    ).toLowerCase() ===
      "live"
  ) {
    return "live";
  }

  return "scheduled";
}

/*
 * ==================================================
 * MAÇ NORMALİZASYONU
 * ==================================================
 */

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

  const status =
    normalizeStatus(
      match
    );

  const liveMinute =
    status === "live"
      ? calculateLiveMinute(
          match
        )
      : null;

  return {
    id:
      toStringValue(
        match?.id
      ),

    external_id:
      toStringValue(
        match?.id
      ),

    source:
      "Mackolik",

    source_id:
      toStringValue(
        match?.id
      ),

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
      toStringValue(
        home?.name
      ) || "",

    away_team:
      toStringValue(
        away?.name
      ) || "",

    home_team_id:
      getTeamId(home),

    away_team_id:
      getTeamId(away),

    home_logo:
      buildLogo(home),

    away_logo:
      buildLogo(away),

    match_date:
      match?.mstUtc
        ? new Date(
            Number(
              match.mstUtc
            )
          ).toISOString()
        : null,

    status,

    state:
      toStringValue(
        match?.state
      ),

    substate:
      toStringValue(
        match?.substate
      ),

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

    penalty_home_score:
      getScoreValue(
        score?.pen,
        "home"
      ),

    penalty_away_score:
      getScoreValue(
        score?.pen,
        "away"
      ),

    iddaa_code:
      match?.iddaaCode != null
        ? String(
            match.iddaaCode
          )
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

    raw:
      match,
  };
}

/*
 * ==================================================
 * MACKOLIK REQUEST
 * ==================================================
 */

async function fetchMackolik(
  date,
  sport
) {
  const url =
    new URL(
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
      () =>
        controller.abort(),
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

          cache:
            "no-store",

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
      data.status !==
        "success"
    ) {
      throw new Error(
        "Mackolik başarısız cevap döndürdü."
      );
    }

    return data;
  } finally {
    clearTimeout(
      timeout
    );
  }
}

/*
 * ==================================================
 * RESPONSE → MAÇLAR
 * ==================================================
 */

function getMatchesFromResponse(
  data,
  sport
) {
  const matches =
    data?.data?.matches ||
    {};

  if (
    !matches ||
    typeof matches !==
      "object"
  ) {
    return [];
  }

  const competitionMap =
    {};

  const competitions =
    data?.data?.competitions;

  if (
    Array.isArray(
      competitions
    )
  ) {
    for (
      const item of
        competitions
    ) {
      if (!item) {
        continue;
      }

      const id =
        item.id ??
        item.key ??
        item.competitionId;

      if (
        id != null
      ) {
        competitionMap[
          String(id)
        ] = item;
      }
    }
  }

  return Object.values(
    matches
  )
    .filter(Boolean)
    .map(
      (match) =>
        normalizeMatch(
          match,
          sport,
          competitionMap
        )
    );
}

/*
 * ==================================================
 * TEK TARİH
 * ==================================================
 */

async function fetchDate(
  date
) {
  const [
    footballData,
    basketballData,
  ] =
    await Promise.all([
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

/*
 * ==================================================
 * TEKRARLARI TEMİZLE
 * ==================================================
 */

function deduplicateMatches(
  matches
) {
  if (
    !Array.isArray(matches)
  ) {
    return [];
  }

  const seen =
    new Set();

  const result = [];

  for (
    const match of matches
  ) {
    if (!match) {
      continue;
    }

    const key =
      String(
        match.external_id ||
          match.id ||
          `${match.home_team}|${match.away_team}|${match.match_date}`
      );

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    result.push(
      match
    );
  }

  return result;
}

/*
 * ==================================================
 * GEÇMİŞ MAÇLAR
 * ==================================================
 *
 * days = 3:
 *
 * bugün
 * dün
 * 2 gün önce
 * 3 gün önce
 */

export async function getHistoricalMatches(
  days = 3
) {
  const safeDays =
    Math.max(
      0,
      Math.min(
        Number(days) || 3,
        7
      )
    );

  const dates =
    Array.from(
      {
        length:
          safeDays + 1,
      },
      (_, index) =>
        getIstanbulDate(
          -index
        )
    );

  const results =
    await Promise.allSettled(
      dates.map(
        (date) =>
          fetchDate(date)
      )
    );

  const allMatches = [];

  for (
    const result of
      results
  ) {
    if (
      result.status ===
      "fulfilled"
    ) {
      allMatches.push(
        ...result.value
      );
    }
  }

  return deduplicateMatches(
    allMatches
  );
}

/*
 * ==================================================
 * NORMAL MAÇLAR
 * ==================================================
 *
 * Ana sayfa ve normal
 * /api/matches için
 * sadece bugün kullanılır.
 */

export async function getMatches() {
  return fetchDate(
    getIstanbulDate()
  );
}

/*
 * ==================================================
 * TEK MAÇ
 * ==================================================
 */

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
      dates.map(
        (date) =>
          fetchDate(date)
      )
    );

  for (
    const result of
      results
  ) {
    if (
      result.status !==
      "fulfilled"
    ) {
      continue;
    }

    const found =
      result.value.find(
        (match) =>
          String(
            match.id
          ) ===
            requestedId ||
          String(
            match.external_id
          ) ===
            requestedId ||
          String(
            match.iddaa_code
          ) ===
            requestedId ||
          String(
            match.match_slug
          ) ===
            requestedId
      );

    if (found) {
      return found;
    }
  }

  return null;
}

/*
 * ==================================================
 * EXPORT
 * ==================================================
 */

export {
  normalizeMatch,
  normalizeStatus,
  calculateLiveMinute,
  getIstanbulDate,
};
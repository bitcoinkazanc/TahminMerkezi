lib/football-api.js

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
      offsetDays * 24 * 60 * 60 * 1000
  );

  const parts =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);

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
 * GENEL YARDIMCILAR
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
 * LOGO
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

  /*
   * 45+2
   * 90+5
   */
  const addedTimeMatch =
    text.match(
      /(\d{1,3})\s*\+\s*(\d{1,2})/
    );

  if (addedTimeMatch) {
    const baseMinute =
      Number(
        addedTimeMatch[1]
      );

    const addedMinute =
      Number(
        addedTimeMatch[2]
      );

    if (
      baseMinute >= 0 &&
      baseMinute <= 150 &&
      addedMinute >= 0 &&
      addedMinute <= 30
    ) {
      return (
        baseMinute +
        addedMinute
      );
    }
  }

  /*
   * 34'
   * 34
   * 90'
   */
  const minuteMatch =
    text.match(
      /\b(\d{1,3})\s*['′]?\b/
    );

  if (minuteMatch) {
    const minute =
      Number(
        minuteMatch[1]
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

/*
 * Mackolik'in doğrudan
 * dakika alanlarını kontrol eder.
 */
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
    match.liveTime,
    match.live_time,
    match.elapsedTime,
    match.elapsed_time,
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

/*
 * statusBoxContent içinden
 * dakika bul.
 */
function getStatusBoxMinute(
  match
) {
  if (!match) {
    return null;
  }

  const candidates = [
    match.statusBoxContent,
    match.status_box_content,
    match.statusBox,
    match.status_box,
    match.statusText,
    match.status_text,
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

    const text =
      String(value).trim();

    if (!text) {
      continue;
    }

    const upper =
      text.toUpperCase();

    /*
     * Devre arası dakika değildir.
     */
    if (
      upper === "İY" ||
      upper === "IY" ||
      upper === "HT" ||
      upper === "HALFTIME"
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

/*
 * ==================================================
 * BİTMİŞ MAÇ KONTROLÜ
 * ==================================================
 */

function isFinishedStatusText(
  match
) {
  if (!match) {
    return false;
  }

  const candidates = [
    match.status,
    match.state,
    match.substate,
    match.statusBoxContent,
    match.status_box_content,
    match.statusBox,
    match.status_box,
    match.statusText,
    match.status_text,
    match.matchStatus,
    match.match_status,
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

    const text =
      String(value)
        .trim()
        .toLowerCase();

    if (!text) {
      continue;
    }

    if (
      [
        "finished",
        "finish",
        "completed",
        "complete",
        "fulltime",
        "full_time",
        "full time",
        "ft",
        "ms",
        "ms.",
        "bitti",
        "maç bitti",
        "mac bitti",
        "bitmiş",
        "bitmis",
      ].includes(text)
    ) {
      return true;
    }

    /*
     * İçinde MS / Bitti gibi
     * ifade taşıyan değerler.
     */
    if (
      text.includes("full time") ||
      text.includes("fulltime") ||
      text.includes("maç bitti") ||
      text.includes("mac bitti")
    ) {
      return true;
    }
  }

  return false;
}

/*
 * ==================================================
 * ZAMAN TABANLI DAKİKA
 * ==================================================
 */

function getTimestamp(
  value
) {
  const timestamp =
    toNumber(value);

  if (
    timestamp === null ||
    timestamp <= 0
  ) {
    return null;
  }

  /*
   * Unix saniye ise
   * milisaniyeye çevir.
   */
  if (
    timestamp <
    100000000000
  ) {
    return (
      timestamp * 1000
    );
  }

  return timestamp;
}

function calculateMinuteFromTimestamp(
  match
) {
  if (!match) {
    return null;
  }

  let startTimestamp =
    getTimestamp(
      match.periodStart ??
        match.period_start ??
        match.periodStartTime ??
        match.period_start_time
    );

  /*
   * periodStart yoksa
   * maç başlangıç zamanı.
   */
  if (
    startTimestamp === null
  ) {
    startTimestamp =
      getTimestamp(
        match.mstUtc
      );
  }

  if (
    startTimestamp === null
  ) {
    return null;
  }

  const elapsed =
    Date.now() -
    startTimestamp;

  /*
   * Henüz başlamadı.
   */
  if (
    elapsed < 0
  ) {
    return null;
  }

  /*
   * Futbol için normal + uzatma
   * maksimum güvenli sınır.
   *
   * 150 dakika dolmadan
   * sadece zaman nedeniyle
   * bitmiş kabul etmiyoruz.
   */
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

/*
 * ==================================================
 * CANLI DAKİKA ANA FONKSİYON
 * ==================================================
 */

function calculateLiveMinute(
  match
) {
  if (!match) {
    return null;
  }

  /*
   * Bitti bilgisi varsa
   * artık canlı dakika verme.
   */
  if (
    isFinishedStatusText(
      match
    )
  ) {
    return null;
  }

  /*
   * Sadece canlı maç.
   */
  if (
    match.state !== "live" &&
    match.status !== "live"
  ) {
    return null;
  }

  /*
   * Devre arası.
   */
  const substate =
    String(
      match.substate ||
        ""
    ).toLowerCase();

  const statusBox =
    String(
      match.statusBoxContent ||
        match.status_box_content ||
        ""
    ).toUpperCase();

  if (
    substate === "halftime" ||
    substate === "halftimebreak" ||
    substate === "half_time" ||
    statusBox === "İY" ||
    statusBox === "IY" ||
    statusBox === "HT"
  ) {
    return null;
  }

  /*
   * 1. Doğrudan dakika.
   */
  const directMinute =
    getDirectLiveMinute(
      match
    );

  if (
    directMinute !== null
  ) {
    return directMinute;
  }

  /*
   * 2. Status box.
   */
  const statusMinute =
    getStatusBoxMinute(
      match
    );

  if (
    statusMinute !== null
  ) {
    return statusMinute;
  }

  /*
   * 3. Timestamp.
   */
  const timestampMinute =
    calculateMinuteFromTimestamp(
      match
    );

  if (
    timestampMinute !== null
  ) {
    return timestampMinute;
  }

  return null;
}

/*
 * ==================================================
 * DURUM
 * ==================================================
 */

function normalizeStatus(
  match
) {
  if (!match) {
    return "scheduled";
  }

  /*
   * Açıkça bitmişse
   * her şeyden önce bunu kullan.
   */
  if (
    isFinishedStatusText(
      match
    )
  ) {
    return "finished";
  }

  const state =
    String(
      match.state ||
        ""
    ).toLowerCase();

  const status =
    String(
      match.status ||
        ""
    ).toLowerCase();

  const substate =
    String(
      match.substate ||
        ""
    ).toLowerCase();

  /*
   * Açık canlı.
   */
  if (
    state === "live" ||
    status === "live" ||
    state === "inprogress" ||
    state === "in_progress"
  ) {
    /*
     * Eğer başlangıç zamanından
     * 150 dakika geçmişse artık
     * canlı kabul etmiyoruz.
     */
    const startTimestamp =
      getTimestamp(
        match.periodStart ??
          match.period_start ??
          match.periodStartTime ??
          match.period_start_time ??
          match.mstUtc
      );

    if (
      startTimestamp !== null
    ) {
      const elapsed =
        Date.now() -
        startTimestamp;

      if (
        elapsed >=
        150 * 60 * 1000
      ) {
        return "finished";
      }
    }

    return "live";
  }

  if (
    state === "finished" ||
    state === "complete" ||
    state === "completed" ||
    status === "finished" ||
    status === "fulltime" ||
    status === "full_time" ||
    substate === "finished" ||
    substate === "complete"
  ) {
    return "finished";
  }

  if (
    state === "cancelled" ||
    state === "canceled" ||
    status === "cancelled" ||
    status === "canceled"
  ) {
    return "cancelled";
  }

  if (
    state === "postponed" ||
    status === "postponed"
  ) {
    return "postponed";
  }

  return "scheduled";
}

/*
 * ==================================================
 * MAÇ NORMALİZE
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

  /*
   * Önce durum.
   */
  const status =
    normalizeStatus(
      match
    );

  /*
   * Durum bittiyse dakika
   * kesinlikle null.
   */
  const liveMinute =
    status === "live"
      ? calculateLiveMinute(
          match
        )
      : null;

  const homeTeamId =
    getTeamId(home);

  const awayTeamId =
    getTeamId(away);

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
      match?.competitionName ||
      match?.leagueName ||
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
      homeTeamId,

    away_team_id:
      awayTeamId,

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
        match?.statusBoxContent ??
          match?.status_box_content
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
 * MACKOLIK FETCH
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

    if (
      !response.ok
    ) {
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
 * RESPONSE PARSE
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
 * TARİH FETCH
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
 * TÜM MAÇLAR
 * ==================================================
 */

export async function getMatches() {
  const date =
    getIstanbulDate();

  const matches =
    await fetchDate(
      date
    );

  return matches;
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
          fetchDate(
            date
          )
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
  parseMinuteText,
  getIstanbulDate,
};
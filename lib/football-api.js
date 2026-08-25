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
  )
    .toLowerCase()
    .trim();
}

function getSubstate(match) {
  return String(
    match?.substate || ""
  )
    .toLowerCase()
    .trim();
}

function getStatusBox(match) {
  return String(
    match?.statusBoxContent ??
      match?.status_box_content ??
      match?.statusBox ??
      match?.status_box ??
      ""
  )
    .trim()
    .toLowerCase();
}

/*
 * Mackolik farklı alanlarda durum
 * gönderebilir. Hepsini tek metinde
 * topluyoruz.
 */

function getAllStatusValues(match) {
  if (!match) {
    return [];
  }

  return [
    match.status,
    match.state,
    match.substate,
    match.statusBoxContent,
    match.status_box_content,
    match.statusBox,
    match.status_box,
    match.matchStatus,
    match.match_status,
    match.gameStatus,
    match.game_status,
    match.periodStatus,
    match.period_status,
  ]
    .filter(
      (value) =>
        value !== null &&
        value !== undefined
    )
    .map(
      (value) =>
        String(value)
          .trim()
          .toLowerCase()
    )
    .filter(Boolean);
}

/*
 * ==================================================
 * BİTMİŞ MAÇ KONTROLÜ
 * ==================================================
 *
 * ÇOK ÖNEMLİ:
 *
 * Bu kontrol LIVE kontrolünden ÖNCE
 * çalışır.
 *
 * Özellikle:
 *
 * state = live
 * statusBoxContent = MS
 *
 * gibi bir durumda maç BİTMİŞ kabul edilir.
 */

function isFinished(match) {
  if (!match) {
    return false;
  }

  const values =
    getAllStatusValues(
      match
    );

  const finishedValues = [
    "finished",
    "finish",
    "completed",
    "complete",
    "ended",
    "end",
    "fulltime",
    "full_time",
    "full-time",
    "final",
    "ft",
    "post",
    "ms",
    "m.s",
    "m.s.",
    "maç sonucu",
    "mac sonucu",
    "maç bitti",
    "mac bitti",
    "bitti",
    "game over",
    "gameover",
    "match over",
    "matchover",
  ];

  /*
   * Tam eşleşme.
   */

  if (
    values.some(
      (value) =>
        finishedValues.includes(
          value
        )
    )
  ) {
    return true;
  }

  /*
   * Metin içinde bitiş bilgisi.
   */

  if (
    values.some(
      (value) =>
        value.includes(
          "maç sonucu"
        ) ||
        value.includes(
          "mac sonucu"
        ) ||
        value.includes(
          "maç bitti"
        ) ||
        value.includes(
          "mac bitti"
        ) ||
        value.includes(
          "full time"
        ) ||
        value.includes(
          "full-time"
        ) ||
        value.includes(
          "finished"
        ) ||
        value.includes(
          "completed"
        ) ||
        value.includes(
          "game over"
        ) ||
        value.includes(
          "match over"
        )
    )
  ) {
    return true;
  }

  /*
   * Status box doğrudan MS ise bitmiştir.
   */

  const statusBox =
    getStatusBox(match);

  if (
    statusBox === "ms" ||
    statusBox === "m.s" ||
    statusBox === "m.s."
  ) {
    return true;
  }

  return false;
}

function isCancelled(match) {
  const values =
    getAllStatusValues(
      match
    );

  return values.some(
    (value) =>
      value ===
        "cancelled" ||
      value ===
        "canceled" ||
      value ===
        "cancel" ||
      value.includes(
        "cancelled"
      ) ||
      value.includes(
        "canceled"
      ) ||
      value.includes(
        "iptal"
      )
  );
}

function isPostponed(match) {
  const values =
    getAllStatusValues(
      match
    );

  return values.some(
    (value) =>
      value ===
        "postponed" ||
      value ===
        "postpone" ||
      value.includes(
        "postponed"
      ) ||
      value.includes(
        "ertelendi"
      ) ||
      value.includes(
        "ertelen"
      )
  );
}

/*
 * ==================================================
 * PENALTI
 * ==================================================
 */

function isPenaltyShootout(match) {
  const substate =
    getSubstate(match);

  const statusBox =
    getStatusBox(match);

  return (
    substate ===
      "penalties" ||
    substate ===
      "penalty" ||
    statusBox ===
      "pen"
  );
}

/*
 * ==================================================
 * DEVRE / PERİYOT ARASI
 * ==================================================
 */

function isHalfTime(match) {
  const substate =
    getSubstate(match);

  const statusBox =
    getStatusBox(match);

  return (
    substate ===
      "halftime" ||
    substate ===
      "half_time" ||
    substate ===
      "half-time" ||
    statusBox ===
      "i̇y" ||
    statusBox ===
      "iy" ||
    statusBox ===
      "ht" ||
    statusBox ===
      "half time"
  );
}

/*
 * ==================================================
 * BASKETBOL PERİYOT KONTROLÜ
 * ==================================================
 */

function isBasketballBreak(
  match
) {
  const substate =
    getSubstate(match);

  const statusBox =
    getStatusBox(match);

  return (
    substate ===
      "quarter_break" ||
    substate ===
      "quarter-break" ||
    substate ===
      "break" ||
    substate ===
      "timeout" ||
    statusBox ===
      "q1" ||
    statusBox ===
      "q2" ||
    statusBox ===
      "q3" ||
    statusBox ===
      "q4"
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
      return (
        base + extra
      );
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
      parseMinuteText(
        value
      );

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
      upper === "IY" ||
      upper === "HT" ||
      upper === "PEN" ||
      upper === "MS"
    ) {
      continue;
    }

    const parsed =
      parseMinuteText(
        text
      );

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
    150 *
      60 *
      1000
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

  /*
   * Bitmiş maç için dakika hesaplama.
   */

  if (
    isFinished(match)
  ) {
    return null;
  }

  if (
    getState(match) !==
      "live" &&
    String(
      match?.status || ""
    ).toLowerCase() !==
      "live"
  ) {
    return null;
  }

  if (
    isHalfTime(match) ||
    isPenaltyShootout(match)
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
 *
 * ÖNEMLİ:
 *
 * FINISHED
 * ↓
 * CANCELLED
 * ↓
 * POSTPONED
 * ↓
 * PENALTIES
 * ↓
 * HALFTIME
 * ↓
 * LIVE
 * ↓
 * SCHEDULED
 *
 * LIVE hiçbir zaman ilk kontrol değildir.
 */

function normalizeStatus(
  match
) {
  if (!match) {
    return "scheduled";
  }

  /*
   * 1. BİTTİ
   */

  if (
    isFinished(match)
  ) {
    return "finished";
  }

  /*
   * 2. İPTAL
   */

  if (
    isCancelled(match)
  ) {
    return "cancelled";
  }

  /*
   * 3. ERTELENDİ
   */

  if (
    isPostponed(match)
  ) {
    return "postponed";
  }

  /*
   * 4. PENALTI
   */

  if (
    isPenaltyShootout(
      match
    )
  ) {
    return "penalties";
  }

  /*
   * 5. DEVRE ARASI
   */

  if (
    isHalfTime(match)
  ) {
    return "halftime";
  }

  /*
   * 6. BASKETBOL ARA
   *
   * Bu hâlâ devam eden maçtır.
   * Dolayısıyla canlı kabul edilir.
   */

  if (
    isBasketballBreak(
      match
    )
  ) {
    const sport =
      String(
        match?.sport ||
          match?.sportType ||
          ""
      ).toLowerCase();

    if (
      sport.includes(
        "basket"
      )
    ) {
      return "live";
    }
  }

  /*
   * 7. CANLI
   */

  const state =
    getState(match);

  const status =
    String(
      match?.status || ""
    )
      .toLowerCase()
      .trim();

  if (
    state === "live" ||
    status === "live"
  ) {
    return "live";
  }

  /*
   * 8. BAŞLAMADI
   */

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
      {
        ...match,
        sport,
      }
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
 */

export async function getMatches() {
  return fetchDate(
    getIstanbulDate()
  );
}

/*
 * ==================================================
 * ARAMA MAÇLARI
 * ==================================================
 */

export async function getSearchMatches() {
  return getMatches();
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
  isFinished,
};
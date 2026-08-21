import * as cheerio from "cheerio";

const MACKOLIK_BASE_URL =
  "https://www.mackolik.com";

const LIVE_SCORES_ENDPOINT =
  "/perform/p0/ajax/components/competition/livescores/json";

const IDDAA_PATH = "/mac";

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
}

async function mackolikRequest(
  sport,
  date = formatDate()
) {
  const url = new URL(
    `${MACKOLIK_BASE_URL}${LIVE_SCORES_ENDPOINT}`
  );

  url.searchParams.set(
    "matchDate",
    date
  );

  url.searchParams.append(
    "sports[]",
    sport === "basketball"
      ? "Basketball"
      : "Soccer"
  );

  const response = await fetch(
    url.toString(),
    {
      method: "GET",
      headers: {
        Accept:
          "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
        Referer:
          "https://www.mackolik.com/",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Mackolik API hatası: ${response.status}`
    );
  }

  const data =
    await response.json();

  if (
    data?.status &&
    data.status !== "success"
  ) {
    throw new Error(
      "Mackolik API başarısız cevap döndürdü."
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
    competitions?.find(
      (item) =>
        String(item?.id) ===
        String(
          match?.competitionId
        )
    );

  const state =
    match?.state || "pre";

  const substate =
    match?.substate || "";

  let status = "scheduled";

  if (state === "live") {
    status = "live";
  } else if (state === "post") {
    status =
      substate === "postponed"
        ? "postponed"
        : "finished";
  }

  const matchName =
    String(
      match?.matchName || ""
    ).trim();

  let homeTeam = "";
  let awayTeam = "";

  if (matchName) {
    const separator =
      matchName.includes(" - ")
        ? " - "
        : matchName.includes(" vs ")
        ? " vs "
        : null;

    if (separator) {
      const parts =
        matchName.split(separator);

      homeTeam =
        String(
          parts[0] || ""
        ).trim();

      awayTeam =
        String(
          parts
            .slice(1)
            .join(separator)
        ).trim();
    }
  }

  homeTeam =
    match?.homeTeam?.name ||
    match?.home?.name ||
    homeTeam;

  awayTeam =
    match?.awayTeam?.name ||
    match?.away?.name ||
    awayTeam;

  const score =
    match?.score || {};

  const homeScoreValue =
    score?.home ??
    match?.homeScore ??
    null;

  const awayScoreValue =
    score?.away ??
    match?.awayScore ??
    null;

  const homeScore =
    homeScoreValue !== null &&
    homeScoreValue !== undefined &&
    homeScoreValue !== ""
      ? Number(homeScoreValue)
      : null;

  const awayScore =
    awayScoreValue !== null &&
    awayScoreValue !== undefined &&
    awayScoreValue !== ""
      ? Number(awayScoreValue)
      : null;

  const iddaaCode =
    match?.iddaaCode ||
    match?.iddaa?.code ||
    null;

  let matchDate = null;

  if (
    match?.mstUtc !== undefined &&
    match?.mstUtc !== null
  ) {
    const timestamp =
      Number(match.mstUtc);

    if (
      Number.isFinite(timestamp)
    ) {
      matchDate =
        new Date(
          timestamp
        ).toISOString();
    }
  }

  /*
   * Bazı Mackolik cevaplarında
   * tarih farklı alanlarda bulunabilir.
   */

  if (!matchDate) {
    const possibleDate =
      match?.matchDate ||
      match?.date ||
      match?.startDate ||
      null;

    if (possibleDate) {
      const parsed =
        new Date(possibleDate);

      if (
        !Number.isNaN(
          parsed.getTime()
        )
      ) {
        matchDate =
          parsed.toISOString();
      }
    }
  }

  return {
    id: String(
      match?.id || ""
    ),

    sport,

    home_team: homeTeam,

    away_team: awayTeam,

    home_logo:
      match?.homeTeam?.logo ||
      match?.homeTeam?.logoUrl ||
      match?.home?.logo ||
      match?.home?.logoUrl ||
      null,

    away_logo:
      match?.awayTeam?.logo ||
      match?.awayTeam?.logoUrl ||
      match?.away?.logo ||
      match?.away?.logoUrl ||
      null,

    league:
      competition?.name ||
      match?.competition?.name ||
      match?.league?.name ||
      (sport === "basketball"
        ? "Basketbol"
        : "Futbol"),

    league_logo:
      competition?.logo ||
      competition?.logoUrl ||
      match?.competition?.logo ||
      match?.competition?.logoUrl ||
      null,

    match_date:
      matchDate,

    status,

    home_score:
      Number.isFinite(homeScore)
        ? homeScore
        : null,

    away_score:
      Number.isFinite(awayScore)
        ? awayScore
        : null,

    source: "mackolik",

    source_id: String(
      match?.id || ""
    ),

    source_status:
      state,

    source_state:
      state,

    source_substate:
      substate,

    status_box_content:
      match?.statusBoxContent ||
      null,

    last_updated:
      new Date().toISOString(),

    live_betting:
      match?.liveBetting ??
      match?.live_betting ??
      false,

    iddaa_code:
      iddaaCode,

    has_iddaa:
      Boolean(iddaaCode),

    competition_id:
      match?.competitionId ??
      competition?.id ??
      null,
  };
}

function normalizeMatches(
  data,
  sport
) {
  const rawMatches =
    data?.data?.matches || {};

  /*
   * Mackolik matches alanı bazı
   * cevaplarda obje, bazı cevaplarda
   * array olarak geliyor.
   */

  const matches =
    Array.isArray(rawMatches)
      ? rawMatches
      : Object.values(
          rawMatches
        );

  const competitions =
    Array.isArray(
      data?.data?.competitions
    )
      ? data.data.competitions
      : [];

  return matches
    .map((match) =>
      normalizeMatch(
        match,
        competitions,
        sport
      )
    )
    .filter(
      (match) =>
        match.id &&
        match.home_team &&
        match.away_team &&
        match.match_date
    );
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

function buildIddaaUrl(
  match
) {
  if (!match) {
    return null;
  }

  const id =
    match.id ||
    match.source_id;

  if (!id) {
    return null;
  }

  const home =
    slugify(
      match.home_team
    );

  const away =
    slugify(
      match.away_team
    );

  const slug =
    home && away
      ? `${home}-${away}`
      : String(id);

  return `${MACKOLIK_BASE_URL}${IDDAA_PATH}/${slug}/${id}`;
}

function cleanText(
  value
) {
  return String(
    value || ""
  )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function parseMarketSelections(
  element
) {
  const selections = [];

  element
    .find(
      "button, a, li, .selection, .odd"
    )
    .each(
      (_, item) => {
        const text =
          cleanText(
            cheerio
              .load(item)
              .text()
          );

        if (text) {
          selections.push(
            text
          );
        }
      }
    );

  return [
    ...new Set(
      selections
    ),
  ];
}

function parseIddaaMarkets(
  html
) {
  if (!html) {
    return [];
  }

  const $ =
    cheerio.load(html);

  const markets = [];

  $(
    ".market, .market-item, .bet-market, [data-market]"
  ).each(
    (_, element) => {
      const title =
        cleanText(
          $(element)
            .find(
              ".market-title, .title, h3, h4"
            )
            .first()
            .text()
        );

      const selections =
        parseMarketSelections(
          $(element)
        );

      if (
        title ||
        selections.length
      ) {
        markets.push({
          name:
            title ||
            "Market",
          selections,
        });
      }
    }
  );

  return markets;
}

export async function getMatchMarkets(
  matchId,
  match = null
) {
  if (!matchId) {
    return [];
  }

  const resolvedMatch =
    match || {
      id: matchId,
    };

  const url =
    buildIddaaUrl(
      resolvedMatch
    );

  if (!url) {
    return [];
  }

  try {
    const response =
      await fetch(
        url,
        {
          method: "GET",
          headers: {
            Accept:
              "text/html,application/xhtml+xml",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
          },
          cache: "no-store",
        }
      );

    if (!response.ok) {
      return [];
    }

    const html =
      await response.text();

    return parseIddaaMarkets(
      html
    );
  } catch {
    return [];
  }
}

export async function getFootballMatches() {
  const data =
    await mackolikRequest(
      "football"
    );

  return normalizeMatches(
    data,
    "football"
  );
}

export async function getBasketballMatches() {
  const data =
    await mackolikRequest(
      "basketball"
    );

  return normalizeMatches(
    data,
    "basketball"
  );
}

export async function getMatches() {
  const [
    football,
import * as cheerio from "cheerio";

const MACKOLIK_BASE_URL =
  "https://www.mackolik.com";

const MACKOLIK_LIVESCORES_PATH =
  "/perform/p0/ajax/components/competition/livescores/json";

const MACKOLIK_IDDAA_PATH =
  "/mac";

function formatDate(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  const year =
    parts.find(
      (part) => part.type === "year"
    )?.value;

  const month =
    parts.find(
      (part) => part.type === "month"
    )?.value;

  const day =
    parts.find(
      (part) => part.type === "day"
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

  const iddaaCode =
    match?.iddaaCode ??
    null;

  const hasIddaa =
    iddaaCode !== null &&
    iddaaCode !== undefined &&
    iddaaCode !== "";

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

    iddaa_code:
      iddaaCode,

    has_iddaa:
      hasIddaa,

    competition_id:
      match?.competitionId ||
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

function slugify(
  value = ""
) {
  return String(value)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /ğ/gi,
      "g"
    )
    .replace(
      /ü/gi,
      "u"
    )
    .replace(
      /ş/gi,
      "s"
    )
    .replace(
      /ı/gi,
      "i"
    )
    .replace(
      /ö/gi,
      "o"
    )
    .replace(
      /ç/gi,
      "c"
    )
    .replace(
      /[^a-zA-Z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .toLowerCase();
}

function buildIddaaUrl(
  matchId,
  match = null
) {
  if (!matchId) {
    throw new Error(
      "İddaa sayfası için maç ID bilgisi gerekli."
    );
  }

  const homeSlug =
    slugify(
      match?.home_team ||
        ""
    );

  const awaySlug =
    slugify(
      match?.away_team ||
        ""
    );

  const matchSlug =
    homeSlug &&
    awaySlug
      ? `${homeSlug}-vs-${awaySlug}`
      : "mac";

  return `${MACKOLIK_BASE_URL}${MACKOLIK_IDDAA_PATH}/${matchSlug}/iddaa/${encodeURIComponent(
    matchId
  )}`;
}

function cleanText(
  value = ""
) {
  return String(value)
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function parseMarketSelections(
  $,
  marketElement
) {
  const selections =
    [];

  const selectionElements =
    $(marketElement)
      .find(
        "li, [class*='selection'], [class*='outcome'], [class*='odd']"
      )
      .toArray();

  for (
    const element of selectionElements
  ) {
    const text =
      cleanText(
        $(element).text()
      );

    if (!text) {
      continue;
    }

    const name =
      cleanText(
        $(element)
          .find(
            "[class*='selection-name'], [class*='outcome-name'], [class*='name'], label"
          )
          .first()
          .text()
      ) ||
      text;

    const odd =
      cleanText(
        $(element)
          .find(
            "[class*='odd'], [class*='odds'], [class*='value'], [class*='price']"
          )
          .first()
          .text()
      ) ||
      null;

    const code =
      $(element).attr(
        "data-code"
      ) ||
      $(element).attr(
        "data-selection"
      ) ||
      $(element).attr(
        "data-outcome"
      ) ||
      $(element).attr(
        "data-id"
      ) ||
      null;

    selections.push({
      name,
      code,
      odd,
    });
  }

  const unique =
    [];

  const seen =
    new Set();

  for (
    const selection of selections
  ) {
    const key =
      `${selection.name}|${selection.code || ""}|${selection.odd || ""}`;

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    unique.push(
      selection
    );
  }

  return unique;
}

function parseIddaaMarkets(
  html
) {
  const $ =
    cheerio.load(
      html
    );

  const markets =
    [];

  const marketElements =
    $(
      ".widget-iddaa-markets__markets-list > li, .widget-iddaa-markets__market"
    ).toArray();

  for (
    const element of marketElements
  ) {
    const marketName =
      cleanText(
        $(element)
          .find(
            "h2, h3, [class*='market-title'], [class*='market-name']"
          )
          .first()
          .text()
      );

    if (!marketName) {
      continue;
    }

    const marketCode =
      $(element).attr(
        "data-code"
      ) ||
      $(element).attr(
        "data-market"
      ) ||
      $(element).attr(
        "data-market-id"
      ) ||
      null;

    const selections =
      parseMarketSelections(
        $,
        element
      );

    markets.push({
      name:
        marketName,

      code:
        marketCode,

      selections,
    });
  }

  const uniqueMarkets =
    [];

  const seenMarkets =
    new Set();

  for (
    const market of markets
  ) {
    const key =
      `${market.name}|${market.code || ""}`;

    if (
      seenMarkets.has(key)
    ) {
      continue;
    }

    seenMarkets.add(key);

    uniqueMarkets.push(
      market
    );
  }

  return uniqueMarkets;
}

export async function getMatchMarkets(
  matchId,
  match = null
) {
  if (!matchId) {
    throw new Error(
      "Market bilgisi için maç ID bilgisi gerekli."
    );
  }

  const url =
    buildIddaaUrl(
      matchId,
      match
    );

  const response =
    await fetch(
      url,
      {
        method: "GET",

        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",

          Referer:
            "https://www.mackolik.com/",

          Origin:
            "https://www.mackolik.com",

          "Accept-Language":
            "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        },

        cache:
          "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `Maçkolik İddaa sayfası hatası: ${response.status}`
    );
  }

  const html =
    await response.text();

  if (
    !html ||
    html.length < 100
  ) {
    throw new Error(
      "Maçkolik İddaa sayfası boş cevap döndürdü."
    );
  }

  const markets =
    parseIddaaMarkets(
      html
    );

  return {
    success:
      true,

    source:
      "mackolik",

    match_id:
      matchId,

    url,

    markets,

    market_count:
      markets.length,
  };
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
import * as cheerio from "cheerio";

const MACKOLIK_BASE_URL =
  "https://www.mackolik.com";

const MACKOLIK_LIVESCORES_PATH =
  "/perform/p0/ajax/components/competition/livescores/json";

const MACKOLIK_IDDAA_PATH =
  "/mac";

function formatDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(date);
}

async function mackolikRequest(
  sport,
  date = new Date()
) {
  const url = new URL(
    `${MACKOLIK_BASE_URL}${MACKOLIK_LIVESCORES_PATH}`
  );

  url.searchParams.set(
    "matchDate",
    formatDate(date)
  );

  url.searchParams.append(
    "sports[]",
    sport
  );

  const response = await fetch(
    url.toString(),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
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
      `Mackolik API hatası: ${response.status}`
    );
  }

  const data =
    await response.json();

  if (data?.status !== "success") {
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
        String(item.id) ===
        String(match?.competitionId)
    );

  const state =
    match?.state || "pre";

  const substate =
    match?.substate || "";

  let status = "scheduled";

  if (state === "live") {
    status = "live";
  } else if (state === "post") {
    if (substate === "postponed") {
      status = "postponed";
    } else {
      status = "finished";
    }
  } else if (state === "pre") {
    status = "scheduled";
  }

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
        new Date(timestamp).toISOString();
    }
  }

  const homeScore =
    match?.homeScore !== undefined &&
    match?.homeScore !== null
      ? Number(match.homeScore)
      : null;

  const awayScore =
    match?.awayScore !== undefined &&
    match?.awayScore !== null
      ? Number(match.awayScore)
      : null;

  const iddaaCode =
    match?.iddaaCode ||
    match?.iddaa?.code ||
    null;

  return {
    id: String(match?.id),

    sport,

    home_team:
      match?.homeTeam?.name ||
      match?.home?.name ||
      "",

    away_team:
      match?.awayTeam?.name ||
      match?.away?.name ||
      "",

    home_logo:
      match?.homeTeam?.logo ||
      match?.homeTeam?.logoUrl ||
      match?.home?.logo ||
      null,

    away_logo:
      match?.awayTeam?.logo ||
      match?.awayTeam?.logoUrl ||
      match?.away?.logo ||
      null,

    league:
      competition?.name ||
      match?.competition?.name ||
      "Futbol",

    league_logo:
      competition?.logo ||
      competition?.logoUrl ||
      match?.competition?.logo ||
      null,

    match_date: matchDate,

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
      match?.id
    ),

    source_status: state,

    source_state: state,

    source_substate: substate,

    status_box_content:
      match?.statusBoxContent ||
      null,

    last_updated:
      new Date().toISOString(),

    live_betting:
      match?.liveBetting ??
      match?.live_betting ??
      false,

    iddaa_code: iddaaCode,

    has_iddaa:
      Boolean(idd aaCode),

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
  const matches =
    data?.data?.matches || [];

  const competitions =
    data?.data?.competitions || [];

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
        match.away_team
    );
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "G")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "O")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "U")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(
      /^-+|-+$/g,
      ""
    );
}

function buildIddaaUrl(
  matchId,
  match
) {
  const home =
    slugify(match?.home_team);

  const away =
    slugify(match?.away_team);

  return `${MACKOLIK_BASE_URL}${MACKOLIK_IDDAA_PATH}/${home}-vs-${away}/iddaa/${matchId}`;
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMarketSelections(
  $,
  marketElement
) {
  const selections = [];

  $(marketElement)
    .find(
      "li, [class*='selection'], [class*='outcome'], [class*='odd']"
    )
    .each((index, element) => {
      const text =
        cleanText($(element).text());

      if (!text) {
        return;
      }

      const oddText =
        cleanText(
          $(element)
            .find(
              "[class*='odd'], [class*='rate'], [class*='value']"
            )
            .first()
            .text()
        );

      const name =
        cleanText(
          $(element)
            .find(
              "[class*='name'], [class*='label'], span"
            )
            .first()
            .text()
        ) || text;

      const code =
        $(element).attr("data-code") ||
        $(element).attr("data-selection") ||
        $(element).attr("data-outcome") ||
        null;

      const oddMatch =
        text.match(
          /(\d+[.,]\d{2,3})/
        );

      const odd =
        oddText ||
        oddMatch?.[1] ||
        null;

      const exists =
        selections.some(
          (item) =>
            item.name === name &&
            item.code === code &&
            item.odd === odd
        );

      if (!exists) {
        selections.push({
          name,
          code,
          odd,
        });
      }
    });

  return selections;
}

function parseIddaaMarkets(html) {
  const $ = cheerio.load(
    html || ""
  );

  const markets = [];

  $(
    ".widget-iddaa-markets__markets-list > li, .widget-iddaa-markets__market, [class*='widget-iddaa-markets__market']"
  ).each((index, element) => {
    const marketTitle =
      cleanText(
        $(element)
          .find(
            "[class*='market-name'], [class*='market-title'], h3, h4, strong"
          )
          .first()
          .text()
      );

    const marketCode =
      $(element).attr(
        "data-market-code"
      ) ||
      $(element).attr(
        "data-code"
      ) ||
      null;

    const selections =
      parseMarketSelections(
        $,
        element
      );

    if (
      marketTitle ||
      selections.length
    ) {
      markets.push({
        name:
          marketTitle ||
          "İddaa",
        code: marketCode,
        selections,
      });
    }
  });

  return markets;
}

export async function getMatchMarkets(
  matchId,
  match = null
) {
  if (!matchId) {
    throw new Error(
      "Maç ID bilgisi gerekli."
    );
  }

  const url =
    buildIddaaUrl(
      matchId,
      match || {}
    );

  const response =
    await fetch(url, {
      method: "GET",
      headers: {
        Accept:
          "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
      },
      cache: "no-store",
    });

  if (!response.ok) {
    throw new Error(
      `Mackolik İddaa sayfası hatası: ${response.status}`
    );
  }

  const html =
    await response.text();

  const markets =
    parseIddaaMarkets(html);

  return {
    success: true,
    source: "mackolik",
    match_id: String(matchId),
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

  const matches =
    await getMatches();

  return (
    matches.find(
      (match) =>
        String(match.id) ===
        String(id)
    ) || null
  );
}

export default {
  getMatches,
  getFootballMatches,
  getBasketballMatches,
  getMatch,
  getMatchMarkets,
};
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MACKOLIK_BASE_URL =
  "https://www.mackolik.com";

const MACKOLIK_LIVE_URL =
  "https://www.mackolik.com/perform/p0/ajax/components/competition/livescores/json";

const DEFAULT_MATCH_ID =
  "c8xvpz70pwcqq45ptmigb5las";

const DEFAULT_IDDAA_CODE =
  "3074731";

const DEFAULT_MATCH_SLUG =
  "erzurumspor-fk-vs-galatasaray";

const MARKET_NAMES = [
  "Maç Sonucu",
  "Devre Sonucu",
  "Altı/Üstü",
  "Çifte Şans",
  "İlk Yarı/Maç Sonucu",
  "Toplam Gol",
  "Maç Skoru",
  "Tek/Çift",
  "Karşılıklı Gol",
  "1. Yarı Çifte Şans",
  "Toplam Gol Aralığı",
  "1. Yarı Karşılıklı Gol",
];

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function safeString(value: unknown): string | null {
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

function safeObject(
  value: unknown
): Record<string, unknown> | null {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return null;
}

function getTagName(element: unknown): string {
  if (
    typeof element === "object" &&
    element !== null &&
    "tagName" in element
  ) {
    const value = (
      element as {
        tagName?: unknown;
      }
    ).tagName;

    return typeof value === "string"
      ? value
      : "";
  }

  return "";
}

function getClassName(element: unknown): string {
  if (
    typeof element === "object" &&
    element !== null &&
    "attribs" in element
  ) {
    const attribs = (
      element as {
        attribs?: Record<string, string>;
      }
    ).attribs;

    if (
      attribs &&
      typeof attribs.class === "string"
    ) {
      return attribs.class;
    }
  }

  return "";
}

function getId(element: unknown): string {
  if (
    typeof element === "object" &&
    element !== null &&
    "attribs" in element
  ) {
    const attribs = (
      element as {
        attribs?: Record<string, string>;
      }
    ).attribs;

    if (
      attribs &&
      typeof attribs.id === "string"
    ) {
      return attribs.id;
    }
  }

  return "";
}

function escapeCssIdentifier(
  value: string
): string {
  return value.replace(
    /([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g,
    "\\$1"
  );
}

function findFirstString(
  object: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = safeString(
      object[key]
    );

    if (value) {
      return value;
    }
  }

  return null;
}

function extractTeamNames(
  matchName: string
): {
  homeTeam: string;
  awayTeam: string;
} {
  const separators = [
    " vs ",
    " - ",
    " v ",
  ];

  for (const separator of separators) {
    if (matchName.includes(separator)) {
      const parts =
        matchName.split(separator);

      if (parts.length >= 2) {
        return {
          homeTeam: parts[0].trim(),
          awayTeam: parts
            .slice(1)
            .join(separator)
            .trim(),
        };
      }
    }
  }

  return {
    homeTeam: matchName,
    awayTeam: "",
  };
}

function normalizeMatch(
  match: Record<string, unknown>
) {
  const matchName =
    findFirstString(match, [
      "matchName",
      "name",
      "title",
    ]) || "";

  const teams =
    extractTeamNames(matchName);

  const score =
    safeObject(match.score);

  const halfTimeScore =
    safeObject(
      match.htScore ||
        match.halfTimeScore ||
        match.half_score
    );

  return {
    id:
      findFirstString(match, [
        "key",
        "id",
        "matchId",
      ]),

    matchName,

    homeTeam:
      findFirstString(match, [
        "homeTeam",
        "home",
      ]) || teams.homeTeam,

    awayTeam:
      findFirstString(match, [
        "awayTeam",
        "away",
      ]) || teams.awayTeam,

    competition:
      findFirstString(match, [
        "competitionName",
        "competition",
        "leagueName",
      ]),

    dateTime:
      findFirstString(match, [
        "mstUtc",
        "dateTime",
        "matchDate",
        "startTime",
      ]),

    status:
      findFirstString(match, [
        "status",
        "state",
      ]),

    minute:
      findFirstString(match, [
        "minute",
        "matchMinute",
      ]),

    score: {
      home:
        findFirstString(
          score || {},
          ["home"]
        ),

      away:
        findFirstString(
          score || {},
          ["away"]
        ),
    },

    halfTimeScore: {
      home:
        findFirstString(
          halfTimeScore || {},
          ["home"]
        ),

      away:
        findFirstString(
          halfTimeScore || {},
          ["away"]
        ),
    },

    iddaaCode:
      findFirstString(match, [
        "iddaaCode",
        "iddaa",
        "betCode",
      ]),

    rawKeys:
      Object.keys(match),
  };
}

function findMatchesInObject(
  value: unknown,
  result: Record<string, unknown>[] = [],
  visited = new Set<unknown>()
): Record<string, unknown>[] {
  if (
    value === null ||
    value === undefined
  ) {
    return result;
  }

  if (
    typeof value !== "object"
  ) {
    return result;
  }

  if (visited.has(value)) {
    return result;
  }

  visited.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      findMatchesInObject(
        item,
        result,
        visited
      );
    }

    return result;
  }

  const object =
    value as Record<string, unknown>;

  const looksLikeMatch =
    typeof object.matchName === "string" ||
    typeof object.iddaaCode === "string" ||
    typeof object.mstUtc === "string" ||
    typeof object.key === "string";

  if (looksLikeMatch) {
    result.push(object);
  }

  for (const child of Object.values(
    object
  )) {
    findMatchesInObject(
      child,
      result,
      visited
    );
  }

  return result;
}

function extractMarketInformation(
  html: string
) {
  const $ = cheerio.load(html);

  const headers: Array<{
    text: string;
    className: string;
  }> = [];

  const seenHeaders = new Set<string>();

  $(
    ".widget-iddaa-markets__header-text"
  ).each((_, element) => {
    const text = cleanText(
      $(element).text()
    );

    if (!text) {
      return;
    }

    const className =
      getClassName(element);

    const key =
      `${text}|${className}`;

    if (seenHeaders.has(key)) {
      return;
    }

    seenHeaders.add(key);

    headers.push({
      text,
      className,
    });
  });

  const marketElements: Array<{
    tag: string;
    className: string;
    id: string;
    text: string;
    html: string;
  }> = [];

  const seenElements =
    new Set<string>();

  $(
    '[class*="widget-iddaa-markets"]'
  ).each((_, element) => {
    const node = $(element);

    const text = cleanText(
      node.text()
    );

    if (
      !text ||
      text.length > 15000
    ) {
      return;
    }

    const tag =
      getTagName(element);

    const className =
      getClassName(element);

    const id =
      getId(element);

    const key =
      `${tag}|${className}|${id}|${text}`;

    if (seenElements.has(key)) {
      return;
    }

    seenElements.add(key);

    marketElements.push({
      tag,
      className,
      id,
      text: text.slice(0, 5000),
      html: $.html(element).slice(
        0,
        15000
      ),
    });
  });

  const candidateRows: Array<{
    tag: string;
    className: string;
    text: string;
    html: string;
  }> = [];

  const seenRows = new Set<string>();

  $(
    ".widget-iddaa-markets__markets-list *"
  ).each((_, element) => {
    const node = $(element);

    const text = cleanText(
      node
        .clone()
        .children()
        .remove()
        .end()
        .text()
    );

    if (!text) {
      return;
    }

    const tag =
      getTagName(element);

    const className =
      getClassName(element);

    const key =
      `${tag}|${className}|${text}`;

    if (seenRows.has(key)) {
      return;
    }

    seenRows.add(key);

    candidateRows.push({
      tag,
      className,
      text: text.slice(0, 1000),
      html: $.html(element).slice(
        0,
        5000
      ),
    });
  });

  const numericTexts: string[] = [];

  $(
    ".widget-iddaa-markets__markets-list"
  )
    .find("*")
    .each((_, element) => {
      const text = cleanText(
        $(element)
          .clone()
          .children()
          .remove()
          .end()
          .text()
      );

      if (
        /^\d+(?:[.,]\d+)?$/.test(text)
      ) {
        if (
          !numericTexts.includes(text)
        ) {
          numericTexts.push(text);
        }
      }
    });

  const marketNamesFound =
    headers
      .map((item) => item.text)
      .filter(
        (value, index, array) =>
          array.indexOf(value) ===
          index
      );

  return {
    pageTitle: cleanText(
      $("title").first().text()
    ),

    bodyTextLength:
      cleanText($("body").text()).length,

    marketHeaders:
      marketNamesFound,

    marketHeaderCount:
      marketNamesFound.length,

    marketElementsCount:
      marketElements.length,

    candidateRowsCount:
      candidateRows.length,

    numericOddCandidates:
      numericTexts.slice(0, 200),

    marketElements:
      marketElements.slice(0, 50),

    candidateRows:
      candidateRows.slice(0, 100),

    scripts: $("script")
      .map((_, element) => {
        const text =
          $(element).html() || "";

        return {
          length: text.length,
          preview: text.slice(0, 500),
        };
      })
      .get()
      .filter(
        (item) => item.length > 100
      )
      .slice(0, 30),

    htmlLength:
      html.length,
  };
}

async function fetchMackolikLive(
  date: string
) {
  const url = new URL(
    MACKOLIK_LIVE_URL
  );

  url.searchParams.append(
    "sports[]",
    "Soccer"
  );

  url.searchParams.set(
    "matchDate",
    date
  );

  const response = await fetch(
    url.toString(),
    {
      method: "GET",

      headers: {
        Accept:
          "application/json,text/plain,*/*",

        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",

        Referer:
          "https://www.mackolik.com/",
      },

      cache: "no-store",
    }
  );

  const text =
    await response.text();

  let json: unknown = null;

  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    url: url.toString(),

    response: {
      status: response.status,
      statusText:
        response.statusText,
      contentType:
        response.headers.get(
          "content-type"
        ) || "",
    },

    rawLength:
      text.length,

    json,

    rawPreview:
      text.slice(0, 3000),
  };
}

async function fetchMackolikMatchPage(
  matchId: string,
  matchSlug: string
) {
  const url =
    `${MACKOLIK_BASE_URL}/mac/${matchSlug}/iddaa/${matchId}`;

  const response = await fetch(
    url,
    {
      method: "GET",

      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",

        Referer:
          "https://www.mackolik.com/",
      },

      cache: "no-store",
    }
  );

  const html =
    await response.text();

  return {
    url,

    response: {
      status: response.status,

      statusText:
        response.statusText,

      contentType:
        response.headers.get(
          "content-type"
        ) || "",
    },

    html,
  };
}

export async function GET(
  request: Request
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const date =
      searchParams.get("date") ||
      new Date()
        .toISOString()
        .slice(0, 10);

    const matchId =
      searchParams.get("matchId") ||
      DEFAULT_MATCH_ID;

    const iddaaCode =
      searchParams.get(
        "iddaaCode"
      ) || DEFAULT_IDDAA_CODE;

    const matchSlug =
      searchParams.get(
        "slug"
      ) || DEFAULT_MATCH_SLUG;

    const live =
      await fetchMackolikLive(
        date
      );

    let liveMatches:
      ReturnType<
        typeof normalizeMatch
      >[] = [];

    let competitions:
      Array<{
        key: string | null;
        name: string | null;
        country: string | null;
        matchCount: number;
      }> = [];

    if (
      live.json !== null
    ) {
      const rawMatches =
        findMatchesInObject(
          live.json
        );

      const uniqueMatches =
        new Map<
          string,
          Record<string, unknown>
        >();

      for (const match of rawMatches) {
        const normalized =
          normalizeMatch(match);

        const key =
          normalized.id ||
          normalized.iddaaCode ||
          normalized.matchName;

        if (
          key &&
          !uniqueMatches.has(key)
        ) {
          uniqueMatches.set(
            key,
            match
          );
        }
      }

      liveMatches =
        Array.from(
          uniqueMatches.values()
        ).map(
          normalizeMatch
        );

      const root =
        safeObject(live.json);

      const data =
        root
          ? safeObject(root.data)
          : null;

      const rawCompetitions =
        data
          ? data.competitions
          : null;

      if (
        Array.isArray(
          rawCompetitions
        )
      ) {
        competitions =
          rawCompetitions.map(
            (competition) => {
              const item =
                safeObject(
                  competition
                );

              if (!item) {
                return {
                  key: null,
                  name: null,
                  country: null,
                  matchCount: 0,
                };
              }

              const rawCompetitionMatches =
                item.matches;

              return {
                key:
                  findFirstString(
                    item,
                    [
                      "key",
                      "id",
                      "competitionId",
                    ]
                  ),

                name:
                  findFirstString(
                    item,
                    [
                      "name",
                      "competitionName",
                      "title",
                    ]
                  ),

                country:
                  findFirstString(
                    item,
                    [
                      "country",
                      "countryName",
                    ]
                  ),

                matchCount:
                  Array.isArray(
                    rawCompetitionMatches
                  )
                    ? rawCompetitionMatches.length
                    : 0,
              };
            }
          );
      }
    }

    const selectedMatch =
      liveMatches.find(
        (match) =>
          match.id === matchId ||
          match.iddaaCode ===
            iddaaCode
      ) || null;

    const detail =
      await fetchMackolikMatchPage(
        matchId,
        matchSlug
      );

    const marketData =
      extractMarketInformation(
        detail.html
      );

    const lowerHtml =
      detail.html.toLocaleLowerCase(
        "tr-TR"
      );

    const featureChecks = {
      matchResult:
        lowerHtml.includes(
          "maç sonucu"
        ),

      halfTimeResult:
        lowerHtml.includes(
          "devre sonucu"
        ),

      overUnder:
        lowerHtml.includes(
          "altı/üstü"
        ),

      doubleChance:
        lowerHtml.includes(
          "çifte şans"
        ),

      halfFull:
        lowerHtml.includes(
          "ilk yarı/maç sonucu"
        ),

      totalGoals:
        lowerHtml.includes(
          "toplam gol"
        ),

      correctScore:
        lowerHtml.includes(
          "maç skoru"
        ),

      oddEven:
        lowerHtml.includes(
          "tek/çift"
        ),

      bothTeamsScore:
        lowerHtml.includes(
          "karşılıklı gol"
        ),

      iddaaCode:
        lowerHtml.includes(
          iddaaCode
        ),

      matchId:
        lowerHtml.includes(
          matchId
        ),
    };

    const uniqueClasses =
      new Set<string>();

    const $ =
      cheerio.load(
        detail.html
      );

    $("*").each(
      (_, element) => {
        const className =
          getClassName(
            element
          );

        if (className) {
          for (const item of className.split(
            /\s+/
          )) {
            if (item) {
              uniqueClasses.add(
                item
              );
            }
          }
        }
      }
    );

    const relevantClasses =
      Array.from(
        uniqueClasses
      )
        .filter(
          (className) =>
            className
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(
                "iddaa"
              ) ||
            className
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(
                "market"
              ) ||
            className
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(
                "odd"
              ) ||
            className
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(
                "coupon"
              )
        )
        .slice(0, 300);

    const result = {
      success: true,

      test:
        "mackolik-complete",

      testedAt:
        new Date().toISOString(),

      request: {
        date,
        matchId,
        iddaaCode,
        matchSlug,
      },

      tests: {
        liveScoresApi: {
          success:
            live.response.status ===
            200,

          status:
            live.response.status,

          contentType:
            live.response.contentType,

          rawLength:
            live.rawLength,

          matchesFound:
            liveMatches.length,

          competitionsFound:
            competitions.length,
        },

        matchDetailPage: {
          success:
            detail.response.status ===
            200,

          status:
            detail.response.status,

          contentType:
            detail.response.contentType,

          htmlLength:
            detail.html.length,

          pageTitle:
            marketData.pageTitle,
        },

        matchIdentification: {
          requestedMatchId:
            matchId,

          requestedIddaaCode:
            iddaaCode,

          foundInLiveData:
            Boolean(selectedMatch),

          selectedMatch,
        },

        iddaaMarkets: {
          marketNamesExpected:
            MARKET_NAMES,

          marketNamesFound:
            marketData.marketHeaders,

          marketCount:
            marketData.marketHeaderCount,

          marketElements:
            marketData.marketElementsCount,

          candidateRows:
            marketData.candidateRowsCount,

          numericOddCandidates:
            marketData.numericOddCandidates,
        },

        featureChecks,

        htmlStructure: {
          relevantClasses,
          scriptsFound:
            marketData.scripts.length,
        },
      },

      live: {
        url: live.url,

        response:
          live.response,

        summary: {
          rawLength:
            live.rawLength,

          totalMatches:
            liveMatches.length,

          competitions:
            competitions.length,
        },

        selectedMatch,
      },

      detail: {
        url: detail.url,

        response:
          detail.response,

        page: {
          title:
            marketData.pageTitle,

          htmlLength:
            detail.html.length,
        },

        markets: {
          headers:
            marketData.marketHeaders,

          headerCount:
            marketData.marketHeaderCount,

          elements:
            marketData.marketElementsCount,

          candidateRows:
            marketData.candidateRowsCount,

          numericOddCandidates:
            marketData.numericOddCandidates,
        },

        featureChecks,
      },

      discoveries: {
        relevantCssClasses:
          relevantClasses,

        marketElements:
          marketData.marketElements,

        candidateRows:
          marketData.candidateRows,

        scripts:
          marketData.scripts,
      },

      raw: {
        livePreview:
          live.rawPreview,

        detailPreview:
          detail.html.slice(
            0,
            5000
          ),
      },
    };

    return NextResponse.json(
      result
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        test:
          "mackolik-complete",

        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen hata",
      },
      {
        status: 500,
      }
    );
  }
}
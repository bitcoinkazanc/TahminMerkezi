import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MATCH_URL =
  "https://www.mackolik.com/mac/fenerbah%C3%A7e-vs-konyaspor/c8ba0e24rm37o4iokkw42ntas";

const REQUEST_TIMEOUT = 15000;

function addUnique(
  list: string[],
  value: unknown
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return;
  }

  const clean = value.trim();

  if (!list.includes(clean)) {
    list.push(clean);
  }
}

function absoluteUrl(
  value: string,
  baseUrl: string
) {
  try {
    return new URL(
      value,
      baseUrl
    ).toString();
  } catch {
    return value;
  }
}

function extractUrls(
  html: string,
  baseUrl: string
) {
  const allUrls: string[] = [];
  const logoLikeUrls: string[] = [];
  const mackolikFeedUrls: string[] = [];
  const mackolikImageUrls: string[] = [];

  /*
   * src="..."
   * src='...'
   * href="..."
   * content="..."
   */
  const attributeRegex =
    /(?:src|href|content)\s*=\s*["']([^"']+)["']/gi;

  let match;

  while (
    (match =
      attributeRegex.exec(html)) !== null
  ) {
    const raw = match[1];

    if (
      !raw ||
      raw.startsWith("data:") ||
      raw.startsWith("javascript:")
    ) {
      continue;
    }

    const url =
      absoluteUrl(
        raw,
        baseUrl
      );

    addUnique(
      allUrls,
      url
    );

    const lower =
      url.toLowerCase();

    if (
      lower.includes(
        "mackolikfeeds"
      )
    ) {
      addUnique(
        mackolikFeedUrls,
        url
      );
    }

    if (
      lower.includes(
        "mackolik"
      ) &&
      (
        lower.includes("logo") ||
        lower.includes("team") ||
        lower.includes("club") ||
        lower.endsWith(".png") ||
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".gif") ||
        lower.includes(".svg")
      )
    ) {
      addUnique(
        mackolikImageUrls,
        url
      );
    }

    if (
      lower.includes("logo") ||
      lower.includes("team") ||
      lower.includes("club") ||
      lower.includes("crest") ||
      lower.includes("badge")
    ) {
      addUnique(
        logoLikeUrls,
        url
      );
    }
  }

  /*
   * srcset="..."
   */
  const srcsetRegex =
    /srcset\s*=\s*["']([^"']+)["']/gi;

  while (
    (match =
      srcsetRegex.exec(html)) !== null
  ) {
    const values =
      match[1].split(",");

    for (const value of values) {
      const parts =
        value.trim().split(/\s+/);

      const rawUrl =
        parts[0];

      if (!rawUrl) {
        continue;
      }

      const url =
        absoluteUrl(
          rawUrl,
          baseUrl
        );

      addUnique(
        allUrls,
        url
      );

      const lower =
        url.toLowerCase();

      if (
        lower.includes(
          "mackolikfeeds"
        )
      ) {
        addUnique(
          mackolikFeedUrls,
          url
        );
      }

      if (
        lower.includes("logo") ||
        lower.includes("team") ||
        lower.includes("club") ||
        lower.includes("crest") ||
        lower.includes("badge")
      ) {
        addUnique(
          logoLikeUrls,
          url
        );
      }
    }
  }

  /*
   * JSON içindeki URL'leri de yakala.
   * Özellikle Next.js / React hydration
   * verilerinde logo bilgisi bulunabilir.
   */
  const jsonUrlRegex =
    /https?:\/\/[^"'\\\s<>]+/gi;

  while (
    (match =
      jsonUrlRegex.exec(html)) !== null
  ) {
    let url =
      match[0];

    url =
      url.replace(
        /[\\'",}\]\)>]+$/,
        ""
      );

    addUnique(
      allUrls,
      url
    );

    const lower =
      url.toLowerCase();

    if (
      lower.includes(
        "mackolikfeeds"
      )
    ) {
      addUnique(
        mackolikFeedUrls,
        url
      );
    }

    if (
      lower.includes("logo") ||
      lower.includes("team") ||
      lower.includes("club") ||
      lower.includes("crest") ||
      lower.includes("badge")
    ) {
      addUnique(
        logoLikeUrls,
        url
      );
    }
  }

  return {
    allUrls,
    logoLikeUrls,
    mackolikFeedUrls,
    mackolikImageUrls,
  };
}

function extractMeta(
  html: string,
  baseUrl: string
) {
  const result: Record<
    string,
    string
  > = {};

  const metaRegex =
    /<meta\b[^>]*>/gi;

  const metas =
    html.match(metaRegex) || [];

  for (const tag of metas) {
    const propertyMatch =
      tag.match(
        /(?:property|name)\s*=\s*["']([^"']+)["']/i
      );

    const contentMatch =
      tag.match(
        /content\s*=\s*["']([^"']+)["']/i
      );

    if (
      !propertyMatch ||
      !contentMatch
    ) {
      continue;
    }

    const key =
      propertyMatch[1]
        .trim()
        .toLowerCase();

    const value =
      absoluteUrl(
        contentMatch[1].trim(),
        baseUrl
      );

    if (
      key === "og:image" ||
      key === "twitter:image" ||
      key === "og:image:url"
    ) {
      result[key] = value;
    }
  }

  return result;
}

function findTeamNames(
  html: string
) {
  const names: string[] = [
    "Fenerbahçe",
    "Konyaspor",
  ];

  const found: string[] = [];

  for (const name of names) {
    if (
      html
        .toLocaleLowerCase("tr-TR")
        .includes(
          name.toLocaleLowerCase(
            "tr-TR"
          )
        )
    ) {
      found.push(name);
    }
  }

  return found;
}

function findRelevantHtml(
  html: string
) {
  const lower =
    html.toLowerCase();

  const keywords = [
    "fenerbahçe",
    "konyaspor",
    "logo",
    "mackolikfeeds",
    "team",
    "club",
    "crest",
    "badge",
  ];

  const results: string[] = [];

  for (const keyword of keywords) {
    let start = 0;
    let count = 0;

    while (count < 5) {
      const index =
        lower.indexOf(
          keyword,
          start
        );

      if (index === -1) {
        break;
      }

      const from =
        Math.max(
          0,
          index - 250
        );

      const to =
        Math.min(
          html.length,
          index + 500
        );

      const snippet =
        html.slice(
          from,
          to
        );

      addUnique(
        results,
        snippet
      );

      start =
        index + keyword.length;

      count++;
    }
  }

  return results;
}

export async function GET(
  request: Request
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT
    );

  try {
    const requestUrl =
      new URL(request.url);

    const targetUrl =
      requestUrl.searchParams.get(
        "url"
      ) ||
      DEFAULT_MATCH_URL;

    let parsedUrl: URL;

    try {
      parsedUrl =
        new URL(
          targetUrl
        );
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geçersiz Maçkolik URL'si.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      parsedUrl.hostname !==
        "www.mackolik.com" &&
      parsedUrl.hostname !==
        "mackolik.com"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Sadece mackolik.com URL'leri test edilebilir.",
        },
        {
          status: 400,
        }
      );
    }

    const response =
      await fetch(
        parsedUrl.toString(),
        {
          method: "GET",
          headers: {
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",

            Referer:
              "https://www.mackolik.com/",

            "Accept-Language":
              "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
          },

          cache:
            "no-store",

          signal:
            controller.signal,
        }
      );

    const html =
      await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          status:
            response.status,
          statusText:
            response.statusText,
          url:
            parsedUrl.toString(),
          htmlLength:
            html.length,
          preview:
            html.slice(
              0,
              1000
            ),
        },
        {
          status: 200,
        }
      );
    }

    const extracted =
      extractUrls(
        html,
        parsedUrl.toString()
      );

    const meta =
      extractMeta(
        html,
        parsedUrl.toString()
      );

    const teamNames =
      findTeamNames(
        html
      );

    const relevantHtml =
      findRelevantHtml(
        html
      );

    /*
     * HTML'in tamamını göndermiyoruz.
     * Sadece teşhis için gerekli bilgileri döndürüyoruz.
     */
    return NextResponse.json(
      {
        success: true,

        targetUrl:
          parsedUrl.toString(),

        httpStatus:
          response.status,

        htmlLength:
          html.length,

        teamNames,

        meta,

        logoLikeUrls:
          extracted.logoLikeUrls,

        mackolikFeedUrls:
          extracted.mackolikFeedUrls,

        mackolikImageUrls:
          extracted.mackolikImageUrls,

        allImageLikeUrls:
          extracted.allUrls.filter(
            (url) => {
              const lower =
                url.toLowerCase();

              return (
                lower.endsWith(
                  ".png"
                ) ||
                lower.endsWith(
                  ".jpg"
                ) ||
                lower.endsWith(
                  ".jpeg"
                ) ||
                lower.endsWith(
                  ".webp"
                ) ||
                lower.endsWith(
                  ".gif"
                ) ||
                lower.includes(
                  ".svg"
                )
              );
            }
          ),

        relevantHtml,

        message:
          "Maçkolik HTML kaynağı tarandı.",
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Mackolik test error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen hata.",
      },
      {
        status: 500,
      }
    );
  } finally {
    clearTimeout(
      timeout
    );
  }
}
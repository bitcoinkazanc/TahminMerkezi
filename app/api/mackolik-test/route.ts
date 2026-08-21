import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MACKOLIK_MATCH_URL =
  "https://www.mackolik.com/mac/erzurumspor-fk-vs-galatasaray/iddaa/c8xvpz70pwcqq45ptmigb5las";

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
];

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function containsMarketName(text: string): string | null {
  const normalized = cleanText(text).toLocaleLowerCase("tr-TR");

  for (const market of MARKET_NAMES) {
    if (
      normalized.includes(
        market.toLocaleLowerCase("tr-TR")
      )
    ) {
      return market;
    }
  }

  return null;
}

function getTagName(element: unknown): string {
  if (
    typeof element === "object" &&
    element !== null &&
    "tagName" in element
  ) {
    const value = (element as { tagName?: unknown }).tagName;

    return typeof value === "string" ? value : "";
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

function escapeCssIdentifier(value: string): string {
  return value.replace(
    /([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g,
    "\\$1"
  );
}

export async function GET() {
  try {
    const response = await fetch(
      MACKOLIK_MATCH_URL,
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

    const html = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,

          test:
            "mackolik-market-html-extraction",

          status: response.status,

          statusText:
            response.statusText,

          rawLength:
            html.length,

          rawPreview:
            html.slice(0, 5000),
        },

        {
          status: response.status,
        }
      );
    }

    const $ = cheerio.load(html);

    const detectedElements: Array<{
      market: string;
      tag: string;
      className: string;
      id: string;
      text: string;
      html: string;
    }> = [];

    const seen = new Set<string>();

    $("*").each((_, element) => {
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

      const market =
        containsMarketName(text);

      if (!market) {
        return;
      }

      const tag =
        getTagName(element);

      const className =
        getClassName(element);

      const id =
        getId(element);

      const key =
        `${market}|${tag}|${className}|${id}|${text}`;

      if (seen.has(key)) {
        return;
      }

      seen.add(key);

      detectedElements.push({
        market,
        tag,
        className,
        id,
        text: text.slice(0, 500),
        html: $.html(element).slice(
          0,
          5000
        ),
      });
    });

    const marketContainers: Array<{
      market: string;
      tag: string;
      className: string;
      id: string;
      text: string;
      html: string;
    }> = [];

    const seenContainers =
      new Set<string>();

    for (const item of detectedElements) {
      let selector = item.tag;

      if (item.id) {
        selector += `#${escapeCssIdentifier(
          item.id
        )}`;
      } else if (item.className) {
        const classes = item.className
          .split(/\s+/)
          .filter(Boolean)
          .map(
            (className) =>
              `.${escapeCssIdentifier(
                className
              )}`
          )
          .join("");

        selector += classes;
      }

      try {
        $(selector).each(
          (_, element) => {
            const container = $(
              element
            );

            const containerText =
              cleanText(
                container.text()
              );

            if (
              !containerText ||
              containerText.length >
                20000
            ) {
              return;
            }

            const key =
              `${item.market}|${getTagName(
                element
              )}|${containerText}`;

            if (
              seenContainers.has(key)
            ) {
              return;
            }

            seenContainers.add(key);

            marketContainers.push({
              market: item.market,

              tag:
                getTagName(element),

              className:
                getClassName(
                  element
                ),

              id:
                getId(element),

              text:
                containerText.slice(
                  0,
                  5000
                ),

              html:
                $.html(element).slice(
                  0,
                  15000
                ),
            });
          }
        );
      } catch {
        continue;
      }
    }

    const pageTitle = cleanText(
      $("title")
        .first()
        .text()
    );

    return NextResponse.json({
      success: true,

      test:
        "mackolik-market-html-extraction",

      request: {
        url: MACKOLIK_MATCH_URL,
      },

      mackolik: {
        status: response.status,

        statusText:
          response.statusText,

        contentType:
          response.headers.get(
            "content-type"
          ) || "",
      },

      page: {
        title: pageTitle,

        htmlLength:
          html.length,
      },

      summary: {
        detectedElements:
          detectedElements.length,

        marketContainers:
          marketContainers.length,
      },

      detectedElements:
        detectedElements.slice(
          0,
          30
        ),

      marketContainers:
        marketContainers.slice(
          0,
          20
        ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        test:
          "mackolik-market-html-extraction",

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
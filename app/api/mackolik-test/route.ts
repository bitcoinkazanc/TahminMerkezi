import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MATCH_ID =
  "8egmmudq1251oapfinzu5ixas";

const MATCH_URL =
  `https://www.mackolik.com/mac/cruz-azul-vs-fc-atlas/${MATCH_ID}`;

function findUrls(
  value: unknown,
  path = "root",
  results: Array<{
    path: string;
    value: string;
  }> = []
) {
  if (
    value === null ||
    value === undefined
  ) {
    return results;
  }

  if (
    typeof value === "string"
  ) {
    const lower =
      value.toLowerCase();

    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      lower.includes("mackolik") ||
      lower.includes("logo") ||
      lower.includes(".gif") ||
      lower.includes(".png") ||
      lower.includes(".jpg") ||
      lower.includes(".webp")
    ) {
      results.push({
        path,
        value,
      });
    }

    return results;
  }

  if (
    Array.isArray(value)
  ) {
    value.forEach(
      (
        item,
        index
      ) => {
        findUrls(
          item,
          `${path}[${index}]`,
          results
        );
      }
    );

    return results;
  }

  if (
    typeof value === "object"
  ) {
    Object.entries(
      value as Record<
        string,
        unknown
      >
    ).forEach(
      ([key, child]) => {
        findUrls(
          child,
          `${path}.${key}`,
          results
        );
      }
    );
  }

  return results;
}

function findInterestingKeys(
  value: unknown,
  path = "root",
  results: Array<{
    path: string;
    key: string;
    value: unknown;
  }> = []
) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return results;
  }

  if (
    Array.isArray(value)
  ) {
    value.forEach(
      (
        item,
        index
      ) => {
        findInterestingKeys(
          item,
          `${path}[${index}]`,
          results
        );
      }
    );

    return results;
  }

  Object.entries(
    value as Record<
      string,
      unknown
    >
  ).forEach(
    ([key, child]) => {
      const lowerKey =
        key.toLowerCase();

      if (
        lowerKey.includes("logo") ||
        lowerKey.includes("image") ||
        lowerKey.includes("team") ||
        lowerKey.includes("club") ||
        lowerKey.includes("crest") ||
        lowerKey.includes("badge")
      ) {
        results.push({
          path:
            `${path}.${key}`,
          key,
          value: child,
        });
      }

      if (
        child &&
        typeof child === "object"
      ) {
        findInterestingKeys(
          child,
          `${path}.${key}`,
          results
        );
      }
    }
  );

  return results;
}

async function fetchJson(
  url: string
) {
  const response =
    await fetch(
      url,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json, text/plain, */*",

          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",

          Referer:
            MATCH_URL,

          Origin:
            "https://www.mackolik.com",
        },

        cache: "no-store",
      }
    );

  const text =
    await response.text();

  let json: unknown = null;

  try {
    json =
      JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    url,
    status:
      response.status,
    ok:
      response.ok,
    contentType:
      response.headers.get(
        "content-type"
      ),
    json,
    text: json
      ? null
      : text.substring(
          0,
          10000
        ),
  };
}

export async function GET() {
  const results: unknown[] = [];

  /*
   * 1 — MAÇ SAYFASI
   */

  try {
    const response =
      await fetch(
        MATCH_URL,
        {
          method: "GET",

          headers: {
            Accept:
              "text/html,application/xhtml+xml",

            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",

            Referer:
              "https://www.mackolik.com/",
          },

          cache: "no-store",
        }
      );

    const html =
      await response.text();

    const foundUrls =
      html.match(
        /https?:\/\/[^"'\\\s<>]+/gi
      ) || [];

    const logoLike =
      foundUrls.filter(
        (
          url
        ) => {
          const lower =
            url.toLowerCase();

          return (
            lower.includes("logo") ||
            lower.includes("team") ||
            lower.includes("club") ||
            lower.includes("crest") ||
            lower.includes("badge") ||
            lower.includes(".gif") ||
            lower.includes(".png") ||
            lower.includes(".webp") ||
            lower.includes(".jpg")
          );
        }
      );

    results.push({
      test:
        "match-page",

      status:
        response.status,

      ok:
        response.ok,

      htmlLength:
        html.length,

      logoLikeUrls:
        Array.from(
          new Set(
            logoLike
          )
        ),
    });

  } catch (
    error
  ) {
    results.push({
      test:
        "match-page",

      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }

  /*
   * 2 — CANLI SKOR API
   */

  const endpoint =
    "https://www.mackolik.com/perform/p0/ajax/components/competition/livescores/json";

  try {
    const now =
      new Date();

    const dateParts =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "Europe/Istanbul",

          year:
            "numeric",

          month:
            "2-digit",

          day:
            "2-digit",
        }
      ).formatToParts(
        now
      );

    const year =
      dateParts.find(
        (item) =>
          item.type ===
          "year"
      )?.value;

    const month =
      dateParts.find(
        (item) =>
          item.type ===
          "month"
      )?.value;

    const day =
      dateParts.find(
        (item) =>
          item.type ===
          "day"
      )?.value;

    const date =
      `${year}-${month}-${day}`;

    const url =
      new URL(
        endpoint
      );

    url.searchParams.set(
      "matchDate",
      date
    );

    url.searchParams.append(
      "sports[]",
      "Soccer"
    );

    const result =
      await fetchJson(
        url.toString()
      );

    results.push({
      test:
        "livescores",

      url:
        result.url,

      status:
        result.status,

      ok:
        result.ok,

      contentType:
        result.contentType,

      interestingKeys:
        findInterestingKeys(
          result.json
        ),

      urls:
        findUrls(
          result.json
        ),

      data:
        result.json,
    });

  } catch (
    error
  ) {
    results.push({
      test:
        "livescores",

      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }

  return NextResponse.json({
    success:
      true,

    testMatch: {
      id:
        MATCH_ID,

      url:
        MATCH_URL,
    },

    message:
      "Mackolik kaynak testi tamamlandı.",

    results,
  });
}
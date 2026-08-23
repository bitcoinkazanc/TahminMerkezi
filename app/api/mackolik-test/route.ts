import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MATCH_ID =
  "8egmmudq1251oapfinzu5ixas";

const MATCH_URL =
  `https://www.mackolik.com/mac/cruz-azul-vs-fc-atlas/${MATCH_ID}`;

function findUrls(value, path = "root", results = []) {
  if (value === null || value === undefined) {
    return results;
  }

  if (typeof value === "string") {
    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.includes("mackolik") ||
      value.includes("logo") ||
      value.includes(".gif") ||
      value.includes(".png") ||
      value.includes(".jpg") ||
      value.includes(".webp")
    ) {
      results.push({
        path,
        value,
      });
    }

    return results;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findUrls(
        item,
        `${path}[${index}]`,
        results
      );
    });

    return results;
  }

  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      findUrls(
        child,
        `${path}.${key}`,
        results
      );
    }
  }

  return results;
}

function findInterestingKeys(
  value,
  path = "root",
  results = []
) {
  if (!value || typeof value !== "object") {
    return results;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      findInterestingKeys(
        item,
        `${path}[${index}]`,
        results
      );
    });

    return results;
  }

  for (const [key, child] of Object.entries(value)) {
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
        path: `${path}.${key}`,
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

  return results;
}

async function fetchJson(
  url
) {
  const response =
    await fetch(url, {
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
    });

  const text =
    await response.text();

  let json = null;

  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    url,
    status: response.status,
    ok: response.ok,
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
  const results = [];

  /*
   * 1
   * Maç sayfasının kendisini kontrol ediyoruz.
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
        (url) => {
          const lower =
            url.toLowerCase();

          return (
            lower.includes("logo") ||
            lower.includes("team") ||
            lower.includes("club") ||
            lower.includes(".gif") ||
            lower.includes(".png") ||
            lower.includes(".webp")
          );
        }
      );

    results.push({
      test: "match-page",
      status: response.status,
      ok: response.ok,
      htmlLength: html.length,
      logoLikeUrls:
        [
          ...new Set(
            logoLike
          ),
        ],
      });

  } catch (error) {
    results.push({
      test: "match-page",
      error:
        error.message,
    });
  }

  /*
   * 2
   * Mevcut canlı skor endpoint'i.
   */
  const endpoint =
    "https://www.mackolik.com/perform/p0/ajax/components/competition/livescores/json";

  try {
    const url =
      new URL(endpoint);

    url.searchParams.set(
      "matchDate",
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "Europe/Istanbul",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      ).format(
        new Date()
      )
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
      ...result,
      interestingKeys:
        findInterestingKeys(
          result.json
        ),
      urls:
        findUrls(
          result.json
        ),
    });

  } catch (error) {
    results.push({
      test:
        "livescores",
      error:
        error.message,
    });
  }

  return NextResponse.json({
    success: true,

    testMatch: {
      id: MATCH_ID,
      url: MATCH_URL,
    },

    message:
      "Mackolik kaynak testi tamamlandı.",

    results,
  });
}
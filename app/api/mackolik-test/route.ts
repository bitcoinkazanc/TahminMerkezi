import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MACKOLIK_MATCH_URL =
  "https://www.mackolik.com/mac/fenerbah%C3%A7e-vs-konyaspor/c8ba0e24rm37o4iokkw42ntas";

function extractUrls(html) {
  const urls = [];

  const patterns = [
    /https?:\/\/file\.mackolikfeeds\.com\/[^"'\\\s<>]+/gi,
    /https?:\\\/\\\/file\.mackolikfeeds\.com\\\/[^"'\\\s<>]+/gi,
  ];

  for (const regex of patterns) {
    let match;

    while (
      (match = regex.exec(html)) !== null
    ) {
      let url =
        match[0]
          .replace(/\\\//g, "/")
          .replace(/\\u002F/gi, "/")
          .replace(/\\u0026/gi, "&")
          .replace(/&amp;/gi, "&");

      if (
        !urls.includes(url)
      ) {
        urls.push(url);
      }
    }
  }

  return urls;
}

export async function GET() {
  try {
    const response =
      await fetch(
        MACKOLIK_MATCH_URL,
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

    const urls =
      extractUrls(html);

    return NextResponse.json(
      {
        success: true,

        http_status:
          response.status,

        html_length:
          html.length,

        logo_urls:
          urls,

        total:
          urls.length,

        message:
          urls.length > 0
            ? "file.mackolikfeeds.com URL'leri bulundu."
            : "Logo URL bulunamadı.",
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma: "no-cache",

          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Mackolik logo test hatası:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Mackolik sayfası okunamadı.",
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma: "no-cache",

          Expires: "0",
        },
      }
    );
  }
}
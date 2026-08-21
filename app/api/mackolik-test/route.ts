import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MACKOLIK_MATCH_URL =
  "https://www.mackolik.com/mac/erzurumspor-fk-vs-galatasaray/iddaa/c8xvpz70pwcqq45ptmigb5las";

export async function GET() {
  try {
    const response = await fetch(MACKOLIK_MATCH_URL, {
      method: "GET",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
        Referer: "https://www.mackolik.com/",
      },
      cache: "no-store",
    });

    const html = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          test: "mackolik-iddaa-detail",
          mackolik: {
            status: response.status,
            statusText: response.statusText,
          },
          error: "Mackolik maç detay sayfası alınamadı.",
          rawLength: html.length,
          rawPreview: html.slice(0, 3000),
        },
        {
          status: response.status,
        }
      );
    }

    const $ = cheerio.load(html);

    const pageTitle = $("title").first().text().trim();

    const marketSections: Array<{
      market: string;
      code: string | null;
      mbs: string | null;
      selections: Array<{
        name: string;
        odd: string;
      }>;
    }> = [];

    $(".widget-iddaa-markets__markets-list > *").each(
      (_, element) => {
        const section = $(element);

        const text = section
          .text()
          .replace(/\s+/g, " ")
          .trim();

        if (!text) {
          return;
        }

        const marketName =
          section
            .find(
              ".widget-iddaa-markets__market-name, .market-name"
            )
            .first()
            .text()
            .replace(/\s+/g, " ")
            .trim() || null;

        const selections: Array<{
          name: string;
          odd: string;
        }> = [];

        section
          .find(
            ".widget-iddaa-markets__market-item, .market-item"
          )
          .each((__, item) => {
            const itemElement = $(item);

            const itemText = itemElement
              .text()
              .replace(/\s+/g, " ")
              .trim();

            if (!itemText) {
              return;
            }

            const odd =
              itemElement
                .find(
                  ".widget-iddaa-markets__odd, .odd"
                )
                .first()
                .text()
                .replace(/\s+/g, " ")
                .trim() || "";

            const name =
              itemElement
                .find(
                  ".widget-iddaa-markets__selection, .selection, .name"
                )
                .first()
                .text()
                .replace(/\s+/g, " ")
                .trim() ||
              itemText;

            selections.push({
              name,
              odd,
            });
          });

        if (
          marketName ||
          selections.length > 0
        ) {
          marketSections.push({
            market:
              marketName ||
              text.slice(0, 150),
            code: null,
            mbs: null,
            selections,
          });
        }
      }
    );

    const bodyText = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    const knownMarkets = [
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

    const detectedMarkets = knownMarkets.filter(
      (market) =>
        bodyText
          .toLocaleLowerCase("tr-TR")
          .includes(
            market.toLocaleLowerCase("tr-TR")
          )
    );

    return NextResponse.json({
      success: true,
      test: "mackolik-iddaa-detail",

      request: {
        url: MACKOLIK_MATCH_URL,
      },

      mackolik: {
        status: response.status,
        statusText: response.statusText,
        contentType:
          response.headers.get("content-type") || "",
      },

      match: {
        title: pageTitle,
        expectedMatch:
          "Erzurumspor FK vs Galatasaray",
        id: "c8xvpz70pwcqq45ptmigb5las",
        iddaaCode: "3074731",
      },

      summary: {
        htmlLength: html.length,
        detectedMarketsCount:
          detectedMarkets.length,
        detectedMarkets,
        parsedMarketSections:
          marketSections.length,
      },

      marketSections,

      rawCheck: {
        hasIddaaText:
          bodyText
            .toLocaleLowerCase("tr-TR")
            .includes("iddaa"),
        hasMatchResult:
          bodyText
            .toLocaleLowerCase("tr-TR")
            .includes("maç sonucu"),
        hasDoubleChance:
          bodyText
            .toLocaleLowerCase("tr-TR")
            .includes("çifte şans"),
        hasOverUnder:
          bodyText
            .toLocaleLowerCase("tr-TR")
            .includes("altı/üstü"),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        test: "mackolik-iddaa-detail",
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
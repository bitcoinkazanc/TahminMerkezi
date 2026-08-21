import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MACKOLIK_BASE_URL =
  "https://www.mackolik.com";

const MACKOLIK_LIVESCORES_PATH =
  "/perform/p0/ajax/components/competition/livescores/json";

function formatDate(
  date = new Date()
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Istanbul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value;

  return `${year}-${month}-${day}`;
}

async function getMackolikData(
  sport
) {
  const matchDate =
    formatDate();

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

function findLiveMatches(
  data,
  sport
) {
  const matches =
    Object.values(
      data?.data?.matches ||
        {}
    );

  return matches
    .filter(
      (match) =>
        match?.state ===
        "live"
    )
    .map(
      (match) => ({
        sport,

        id:
          match?.id ||
          null,

        matchName:
          match?.matchName ||
          null,

        homeTeam:
          match?.homeTeam ||
          null,

        awayTeam:
          match?.awayTeam ||
          null,

        competitionId:
          match?.competitionId ||
          null,

        status:
          match?.status ||
          null,

        state:
          match?.state ||
          null,

        substate:
          match?.substate ||
          null,

        score:
          match?.score ||
          null,

        iddaaCode:
          match?.iddaaCode ??
          null,

        liveBetting:
          match?.liveBetting ??
          null,

        statusBoxContent:
          match?.statusBoxContent ||
          null,

        mstUtc:
          match?.mstUtc ||
          null,

        rawKeys:
          Object.keys(
            match || {}
          ),
      })
    );
}

export async function GET() {
  try {
    const [
      footballData,
      basketballData,
    ] = await Promise.all([
      getMackolikData(
        "Soccer"
      ),
      getMackolikData(
        "Basketball"
      ),
    ]);

    const footballLive =
      findLiveMatches(
        footballData,
        "football"
      );

    const basketballLive =
      findLiveMatches(
        basketballData,
        "basketball"
      );

    const liveMatches = [
      ...footballLive,
      ...basketballLive,
    ];

    return NextResponse.json(
      {
        success: true,

        matchDate:
          formatDate(),

        totalLive:
          liveMatches.length,

        footballLive:
          footballLive.length,

        basketballLive:
          basketballLive.length,

        matches:
          liveMatches,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma:
            "no-cache",

          Expires:
            "0",
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
          error?.message ||
          "Maçkolik verisi alınamadı.",
      },
      {
        status: 500,
      }
    );
  }
}
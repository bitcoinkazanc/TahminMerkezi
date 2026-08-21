import { NextResponse } from "next/server";

export async function GET() {
  const url =
    "https://www.mackolik.com/perform/p0/ajax/components/competition/livescores/json" +
    "?matchDate=21-08-2026" +
    "&sports[]=Soccer";

  try {
    const response =
      await fetch(url, {
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
      });

    const data =
      await response.json();

    const matches =
      Object.values(
        data?.data?.matches || {}
      );

    const stateCounts = {};
    const statusCounts = {};
    const substateCounts = {};

    const turkeyMatches = [];

    for (const match of matches) {

      const state =
        String(
          match?.state || ""
        );

      const status =
        String(
          match?.status || ""
        );

      const substate =
        String(
          match?.substate || ""
        );

      stateCounts[state] =
        (stateCounts[state] || 0) + 1;

      statusCounts[status] =
        (statusCounts[status] || 0) + 1;

      substateCounts[substate] =
        (substateCounts[substate] || 0) + 1;

      const competition =
        data?.data?.competitions?.[
          match?.competitionId
        ];

      if (
        competition?.country?.name ===
          "Türkiye"
      ) {
        turkeyMatches.push({
          id: match.id,
          matchName: match.matchName,
          competition:
            competition.name,
          state: match.state,
          status: match.status,
          substate: match.substate,
          score: match.score,
          statusBoxContent:
            match.statusBoxContent,
          lastUpdated:
            match.lastUpdated,
          liveBetting:
            match.liveBetting
        });
      }
    }

    return NextResponse.json({
      success: true,

      totalMatches:
        matches.length,

      stateCounts,
      statusCounts,
      substateCounts,

      turkeyMatchCount:
        turkeyMatches.length,

      turkeyMatches
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Bilinmeyen hata"
      },
      {
        status: 500
      }
    );
  }
}
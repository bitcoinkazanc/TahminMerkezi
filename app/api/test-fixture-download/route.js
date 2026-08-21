import { NextResponse } from "next/server";

export async function GET() {
  const url =
    "https://local-global.flashscore.ninja/2/x/feed/f_1_0_3_en_1";

  try {
    const response =
      await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
          "Accept":
            "*/*",
          "Referer":
            "https://www.flashscore.com/",
          "x-fsign":
            "SW9D1eZo",
        },
        cache: "no-store",
      });

    const text =
      await response.text();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        status: response.status,
        error:
          text.substring(0, 1000),
      });
    }

    const turkeyIndex =
      text.indexOf("ZY÷Turkey");

    if (turkeyIndex === -1) {
      return NextResponse.json({
        success: false,
        status: response.status,
        error:
          "Turkey bölümü bulunamadı.",
      });
    }

    const turkeyStart =
      text.lastIndexOf(
        "¬~ZA÷",
        turkeyIndex
      );

    const nextCompetition =
      text.indexOf(
        "¬~ZA÷",
        turkeyIndex + 10
      );

    const turkeyEnd =
      nextCompetition === -1
        ? text.length
        : nextCompetition;

    const turkeySection =
      text.substring(
        turkeyStart,
        turkeyEnd
      );

    const matchChunks =
      turkeySection.split("¬~AA÷");

    const turkeyMatches = [];

    for (const chunk of matchChunks) {
      if (!chunk.includes("AA÷")) {
        continue;
      }

      const matchIdMatch =
        chunk.match(
          /^AA÷([^¬]+)/
        );

      const timestampMatch =
        chunk.match(
          /¬AD÷([^¬]+)/
        );

      const statusMatch =
        chunk.match(
          /¬AB÷([^¬]+)/
        );

      const homeMatch =
        chunk.match(
          /¬CX÷([^¬]+)/
        );

      const awayMatch =
        chunk.match(
          /¬AF÷([^¬]+)/
        );

      const homeScoreMatch =
        chunk.match(
          /¬AG÷([^¬]+)/
        );

      const awayScoreMatch =
        chunk.match(
          /¬AH÷([^¬]+)/
        );

      const minuteMatch =
        chunk.match(
          /¬BA÷([^¬]+)/
        );

      const periodMatch =
        chunk.match(
          /¬BC÷([^¬]+)/
        );

      const matchId =
        matchIdMatch
          ? matchIdMatch[1]
          : null;

      const timestamp =
        timestampMatch
          ? Number(timestampMatch[1])
          : null;

      const status =
        statusMatch
          ? statusMatch[1]
          : null;

      const home =
        homeMatch
          ? homeMatch[1]
          : null;

      const away =
        awayMatch
          ? awayMatch[1]
          : null;

      const homeScore =
        homeScoreMatch
          ? homeScoreMatch[1]
          : null;

      const awayScore =
        awayScoreMatch
          ? awayScoreMatch[1]
          : null;

      const minute =
        minuteMatch
          ? minuteMatch[1]
          : null;

      const period =
        periodMatch
          ? periodMatch[1]
          : null;

      if (
        !matchId ||
        !home ||
        !away
      ) {
        continue;
      }

      turkeyMatches.push({
        competition:
          "Turkey: Super Lig",
        matchId,
        home,
        away,
        status,
        homeScore,
        awayScore,
        minute,
        period,
        timestamp,
        live:
          status === "2",
      });
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      totalDataLength:
        text.length,
      turkeySectionLength:
        turkeySection.length,
      turkeyMatchCount:
        turkeyMatches.length,
      liveTurkeyMatchCount:
        turkeyMatches.filter(
          (match) =>
            match.live
        ).length,
      turkeyMatches,
      liveTurkeyMatches:
        turkeyMatches.filter(
          (match) =>
            match.live
        ),
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }
}
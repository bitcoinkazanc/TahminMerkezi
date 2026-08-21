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
        error: text.substring(0, 1000),
      });
    }

    const sections =
      text.split("¬~ZA÷");

    const turkeySections =
      sections.filter((section) =>
        section.includes("ZY÷Turkey")
      );

    const turkeyMatches = [];

    for (const section of turkeySections) {
      const competitionNameMatch =
        section.match(/^([^¬]+)¬/);

      const competitionName =
        competitionNameMatch
          ? competitionNameMatch[1]
          : "Bilinmeyen lig";

      const matches =
        section.split("¬~AA÷");

      for (const match of matches) {
        if (!match.includes("AA÷")) {
          continue;
        }

        const homeMatch =
          match.match(/¬CX÷([^¬]+)/);

        const awayMatch =
          match.match(/¬AF÷([^¬]+)/);

        const statusMatch =
          match.match(/¬AB÷([^¬]+)/);

        const matchIdMatch =
          match.match(/AA÷([^¬]+)/);

        const timestampMatch =
          match.match(/¬AD÷([^¬]+)/);

        const home =
          homeMatch
            ? homeMatch[1]
            : null;

        const away =
          awayMatch
            ? awayMatch[1]
            : null;

        const status =
          statusMatch
            ? statusMatch[1]
            : null;

        const matchId =
          matchIdMatch
            ? matchIdMatch[1]
            : null;

        const timestamp =
          timestampMatch
            ? timestampMatch[1]
            : null;

        if (home && away) {
          turkeyMatches.push({
            competition:
              competitionName,
            matchId,
            home,
            away,
            status,
            timestamp,
            live:
              status === "2",
          });
        }
      }
    }

    const liveTurkeyMatches =
      turkeyMatches.filter(
        (match) => match.live
      );

    return NextResponse.json({
      success: true,
      status: response.status,

      totalDataLength:
        text.length,

      turkeySectionCount:
        turkeySections.length,

      turkeyMatchCount:
        turkeyMatches.length,

      liveTurkeyMatchCount:
        liveTurkeyMatches.length,

      turkeyMatches,

      liveTurkeyMatches,
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
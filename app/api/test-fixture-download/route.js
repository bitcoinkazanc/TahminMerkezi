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

    const aaMatches = [
      ...turkeySection.matchAll(
        /AA÷([^¬]+)/g
      ),
    ];

    const samples =
      aaMatches
        .slice(0, 10)
        .map((match) => {
          const index =
            match.index;

          return {
            matchId:
              match[1],
            index,
            before:
              turkeySection.substring(
                Math.max(
                  0,
                  index - 30
                ),
                index
              ),
            after:
              turkeySection.substring(
                index,
                Math.min(
                  turkeySection.length,
                  index + 500
                )
              ),
          };
        });

    return NextResponse.json({
      success: true,
      status: response.status,

      totalDataLength:
        text.length,

      turkeySectionLength:
        turkeySection.length,

      aaCount:
        aaMatches.length,

      samples,
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
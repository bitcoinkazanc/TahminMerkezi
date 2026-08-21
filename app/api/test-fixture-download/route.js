import { NextResponse } from "next/server";

export async function GET() {
  const liveUrl =
    "https://local-global.flashscore.ninja/2/x/feed/r_1_1";

  try {
    const liveResponse =
      await fetch(liveUrl, {
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

    const liveText =
      await liveResponse.text();

    if (!liveResponse.ok) {
      return NextResponse.json({
        success: false,
        step: "live_feed",
        status: liveResponse.status,
        preview:
          liveText.substring(0, 1000),
      });
    }

    const idMatch =
      liveText.match(
        /AA÷([^¬~]+)/
      );

    if (!idMatch) {
      return NextResponse.json({
        success: true,
        step: "live_feed",
        dataLength:
          liveText.length,
        message:
          "Live feed içinde maç ID bulunamadı.",
        preview:
          liveText.substring(0, 1000),
      });
    }

    const matchId =
      idMatch[1];

    const matchUrl =
      `https://local-global.flashscore.ninja/2/x/feed/df_sui_1_${matchId}`;

    const matchResponse =
      await fetch(matchUrl, {
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

    const matchText =
      await matchResponse.text();

    return NextResponse.json({
      success:
        matchResponse.ok,
      step:
        "match_detail",
      liveFeedStatus:
        liveResponse.status,
      liveFeedLength:
        liveText.length,
      matchId,
      matchStatus:
        matchResponse.status,
      matchDataLength:
        matchText.length,
      preview:
        matchText.substring(0, 5000),
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
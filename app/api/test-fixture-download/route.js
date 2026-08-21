import { NextResponse } from "next/server";

export async function GET() {
  const url =
    "https://local-global.flashscore.ninja/2/x/feed/r_1_1";

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

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      dataLength: text.length,
      containsTurkey:
        text
          .toLowerCase()
          .includes("turkey"),
      containsSuperLig:
        text
          .toLowerCase()
          .includes("super lig"),
      containsLiveStatus:
        text.includes("AB÷2"),
      preview:
        text.substring(0, 5000),
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
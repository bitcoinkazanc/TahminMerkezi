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
        totalDataLength:
          text.length,
      });
    }

    const beforeTurkey =
      text.lastIndexOf(
        "¬~ZA÷",
        turkeyIndex
      );

    const afterTurkey =
      text.indexOf(
        "¬~ZA÷",
        turkeyIndex + 10
      );

    const start =
      beforeTurkey >= 0
        ? beforeTurkey
        : turkeyIndex;

    const end =
      afterTurkey >= 0
        ? afterTurkey
        : text.length;

    const turkeySection =
      text.substring(
        start,
        end
      );

    return NextResponse.json({
      success: true,
      status: response.status,

      totalDataLength:
        text.length,

      turkeyStart:
        start,

      turkeyLength:
        turkeySection.length,

      containsAA:
        turkeySection.includes("AA÷"),

      containsCX:
        turkeySection.includes("CX÷"),

      containsAF:
        turkeySection.includes("AF÷"),

      containsAB:
        turkeySection.includes("AB÷"),

      containsAD:
        turkeySection.includes("AD÷"),

      preview:
        turkeySection.substring(
          0,
          15000
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
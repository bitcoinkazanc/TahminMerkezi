import { NextResponse } from "next/server";
import { getMatches } from "../../../lib/football-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getMatches(50);

    const matches = Array.isArray(data?.matches)
      ? data.matches
      : [];

    return NextResponse.json(
      {
        success: true,

        total: matches.length,

        first_matches: matches.slice(0, 10).map((match) => ({
          home: match.home,
          away: match.away,
          home_score: match.home_score,
          away_score: match.away_score,
          status: match.status,
          status_text: match.status_text,
          time: match.time,
          competition: match.competition,
          url: match.url,
        })),

        raw_first_match:
          matches.length > 0
            ? matches[0]
            : null,
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
    console.error("SportScore debug error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "SportScore verisi alınamadı.",
      },
      {
        status: 500,
      }
    );
  }
}
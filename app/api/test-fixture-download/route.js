import { NextResponse } from "next/server";

export async function GET() {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      today.getDate()
    ).padStart(2, "0");

  const matchDate =
    `${year}-${month}-${day}`;

  const url =
    "https://www.mackolik.com/perform/p0/ajax/components/competition/livescores/json" +
    `?matchDate=${matchDate}` +
    "&sports[]=Basketball";

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
            "https://www.mackolik.com"
        },
        cache: "no-store"
      });

    const data =
      await response.json();

    const matches =
      Object.values(
        data?.data?.matches || {}
      );

    const liveCandidates =
      matches
        .filter(
          (match) =>
            match?.state !== "pre" &&
            match?.substate !== "fullTime" &&
            match?.substate !== "postponed"
        )
        .map(
          (match) => {

            const competition =
              data?.data?.competitions?.[
                match?.competitionId
              ];

            return {
              id:
                match.id,

              matchName:
                match.matchName,

              competition:
                competition?.name || "",

              country:
                competition?.country?.name ||
                "",

              state:
                match.state,

              status:
                match.status,

              substate:
                match.substate,

              score:
                match.score,

              statusBoxContent:
                match.statusBoxContent,

              lastUpdated:
                match.lastUpdated,

              liveBetting:
                match.liveBetting
            };
          }
        );

    return NextResponse.json({
      success: true,

      matchDate,

      totalMatches:
        matches.length,

      liveCandidateCount:
        liveCandidates.length,

      liveCandidates
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
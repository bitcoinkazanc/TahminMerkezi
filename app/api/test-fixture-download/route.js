import { NextResponse } from "next/server";

function getField(text, field) {
  const match =
    text.match(
      new RegExp(
        `(?:^|¬)${field}÷([^¬]+)`
      )
    );

  return match
    ? match[1]
    : null;
}

function parseMatch(matchText) {
  const matchId =
    getField(matchText, "AA");

  const timestamp =
    getField(matchText, "AD");

  const status =
    getField(matchText, "AB");

  const home =
    getField(matchText, "CX");

  const away =
    getField(matchText, "AF");

  const homeScore =
    getField(matchText, "AG");

  const awayScore =
    getField(matchText, "AH");

  const minute =
    getField(matchText, "BA");

  const period =
    getField(matchText, "BC");

  if (
    !matchId ||
    !home ||
    !away
  ) {
    return null;
  }

  return {
    matchId,
    timestamp:
      timestamp
        ? Number(timestamp)
        : null,

    status,

    home,
    away,

    homeScore,
    awayScore,

    minute,
    period,

    live:
      status === "2",

    finished:
      status === "3",

    scheduled:
      status === "1",
  };
}

function parseCompetition(
  competitionSection
) {
  const competitionName =
    getField(
      competitionSection,
      "ZA"
    );

  const country =
    getField(
      competitionSection,
      "ZY"
    );

  const leagueSlug =
    getField(
      competitionSection,
      "ZL"
    );

  const matches = [];

  const matchParts =
    competitionSection.split(
      "¬~AA÷"
    );

  for (
    let i = 1;
    i < matchParts.length;
    i++
  ) {
    const matchText =
      "AA÷" +
      matchParts[i];

    const match =
      parseMatch(matchText);

    if (!match) {
      continue;
    }

    matches.push({
      ...match,

      competition:
        competitionName,

      country,

      leagueSlug,
    });
  }

  return {
    competition:
      competitionName,

    country,

    leagueSlug,

    matches,
  };
}

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

        status:
          response.status,

        error:
          text.substring(
            0,
            1000
          ),
      });
    }

    const sections =
      text.split(
        "¬~ZA÷"
      );

    const competitions = [];

    for (
      let i = 1;
      i < sections.length;
      i++
    ) {
      const section =
        "ZA÷" +
        sections[i];

      const competition =
        parseCompetition(
          section
        );

      if (
        competition.matches
          .length > 0
      ) {
        competitions.push(
          competition
        );
      }
    }

    const allMatches =
      competitions.flatMap(
        (competition) =>
          competition.matches
      );

    const turkeyMatches =
      allMatches.filter(
        (match) =>
          String(
            match.country || ""
          ).toLowerCase() ===
            "turkey" ||
          String(
            match.competition || ""
          )
            .toLowerCase()
            .includes("turkey")
      );

    const liveMatches =
      allMatches.filter(
        (match) =>
          match.status === "2"
      );

    const liveTurkeyMatches =
      turkeyMatches.filter(
        (match) =>
          match.status === "2"
      );

    return NextResponse.json({
      success: true,

      sourceStatus:
        response.status,

      totalDataLength:
        text.length,

      competitionCount:
        competitions.length,

      totalMatchCount:
        allMatches.length,

      liveMatchCount:
        liveMatches.length,

      turkeyMatchCount:
        turkeyMatches.length,

      liveTurkeyMatchCount:
        liveTurkeyMatches.length,

      turkeyMatches,

      liveTurkeyMatches,

      sampleMatches:
        allMatches.slice(
          0,
          20
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
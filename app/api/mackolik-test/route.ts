import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MACKOLIK_URL =
  "https://www.mackolik.com/perform/p0/ajax/components/competition/livescores/json";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function getString(
  object: UnknownRecord,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = object[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return null;
}

function findMatchesContainer(
  data: UnknownRecord
): UnknownRecord | unknown[] | null {
  const directMatches = data["matches"];

  if (isRecord(directMatches) || Array.isArray(directMatches)) {
    return directMatches;
  }

  const nestedData = data["data"];

  if (isRecord(nestedData)) {
    const nestedMatches = nestedData["matches"];

    if (isRecord(nestedMatches) || Array.isArray(nestedMatches)) {
      return nestedMatches;
    }
  }

  return null;
}

function normalizeMatches(
  matchesContainer: UnknownRecord | unknown[]
): UnknownRecord[] {
  if (Array.isArray(matchesContainer)) {
    return matchesContainer.filter(isRecord);
  }

  return Object.entries(matchesContainer).map(([key, value]) => {
    if (isRecord(value)) {
      return {
        _objectKey: key,
        ...value,
      };
    }

    return {
      _objectKey: key,
      value,
    };
  });
}

function extractTeamName(
  team: unknown
): string | null {
  if (typeof team === "string") {
    return team;
  }

  if (!isRecord(team)) {
    return null;
  }

  return getString(
    team,
    "name",
    "teamName",
    "title",
    "shortName"
  );
}

function extractCompetitionName(
  match: UnknownRecord
): string | null {
  const competition = match["competition"];

  if (typeof competition === "string") {
    return competition;
  }

  if (isRecord(competition)) {
    return getString(
      competition,
      "name",
      "competitionName",
      "title"
    );
  }

  return getString(
    match,
    "competitionName",
    "leagueName"
  );
}

function extractMatch(
  match: UnknownRecord
) {
  const score = isRecord(match["score"])
    ? match["score"]
    : null;

  const halfTimeScore =
    score && isRecord(score["ht"])
      ? score["ht"]
      : null;

  const homeTeam =
    extractTeamName(match["home"]) ||
    extractTeamName(match["homeTeam"]) ||
    extractTeamName(match["teamHome"]);

  const awayTeam =
    extractTeamName(match["away"]) ||
    extractTeamName(match["awayTeam"]) ||
    extractTeamName(match["teamAway"]);

  const homeScore =
    score
      ? getString(score, "home")
      : null;

  const awayScore =
    score
      ? getString(score, "away")
      : null;

  const halfTimeHome =
    halfTimeScore
      ? getString(halfTimeScore, "home")
      : null;

  const halfTimeAway =
    halfTimeScore
      ? getString(halfTimeScore, "away")
      : null;

  return {
    id:
      getString(
        match,
        "id",
        "key",
        "matchId"
      ) ||
      getString(match, "_objectKey"),

    matchName:
      getString(
        match,
        "matchName",
        "name",
        "title"
      ) ||
      (
        homeTeam && awayTeam
          ? `${homeTeam} - ${awayTeam}`
          : null
      ),

    homeTeam,

    awayTeam,

    competition:
      extractCompetitionName(match),

    dateTime:
      getString(
        match,
        "mstUtc",
        "startTime",
        "matchDate",
        "date",
        "dateTime"
      ),

    status:
      getString(
        match,
        "status",
        "matchStatus",
        "state"
      ),

    minute:
      getString(
        match,
        "minute",
        "matchMinute",
        "elapsed"
      ),

    score: {
      home: homeScore,
      away: awayScore,
    },

    halfTimeScore: {
      home: halfTimeHome,
      away: halfTimeAway,
    },

    iddaaCode:
      getString(
        match,
        "iddaaCode",
        "iddaa",
        "betCode"
      ),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const requestedDate =
      searchParams.get("date") ||
      new Date().toISOString().slice(0, 10);

    const targetUrl = new URL(MACKOLIK_URL);

    targetUrl.searchParams.append(
      "sports[]",
      "Soccer"
    );

    targetUrl.searchParams.set(
      "matchDate",
      requestedDate
    );

    const response = await fetch(
      targetUrl.toString(),
      {
        method: "GET",

        headers: {
          Accept:
            "application/json, text/plain, */*",

          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",

          Referer:
            "https://www.mackolik.com/canli-sonuclar",

          Origin:
            "https://www.mackolik.com",
        },

        cache: "no-store",
      }
    );

    const contentType =
      response.headers.get("content-type") ||
      "";

    const rawText =
      await response.text();

    let parsedData: unknown = null;

    try {
      parsedData =
        JSON.parse(rawText);
    } catch {
      parsedData = null;
    }

    if (
      !parsedData ||
      !isRecord(parsedData)
    ) {
      return NextResponse.json(
        {
          success: false,

          test: "mackolik-match-extraction",

          request: {
            date: requestedDate,
            url: targetUrl.toString(),
          },

          mackolik: {
            status: response.status,
            statusText: response.statusText,
            contentType,
          },

          response: {
            isJson: false,
            rawLength: rawText.length,
            rawPreview:
              rawText.slice(0, 5000),
          },
        },

        {
          status:
            response.ok
              ? 200
              : response.status,
        }
      );
    }

    const rootData =
      isRecord(parsedData["data"])
        ? parsedData["data"]
        : parsedData;

    const matchesContainer =
      findMatchesContainer(parsedData);

    if (!matchesContainer) {
      return NextResponse.json(
        {
          success: false,

          test:
            "mackolik-match-extraction",

          request: {
            date: requestedDate,
            url: targetUrl.toString(),
          },

          mackolik: {
            status: response.status,
            statusText: response.statusText,
            contentType,
          },

          error:
            "Mackolik cevabında matches alanı bulunamadı.",

          availableRootKeys:
            Object.keys(rootData),

          availableTopLevelKeys:
            Object.keys(parsedData),
        },

        {
          status: 500,
        }
      );
    }

    const allMatches =
      normalizeMatches(matchesContainer);

    const extractedMatches =
      allMatches.map(extractMatch);

    const firstTenMatches =
      extractedMatches.slice(0, 10);

    const firstThreeRawMatches =
      allMatches.slice(0, 3);

    return NextResponse.json({
      success: response.ok,

      test:
        "mackolik-match-extraction",

      request: {
        date: requestedDate,
        url: targetUrl.toString(),
      },

      mackolik: {
        status: response.status,
        statusText: response.statusText,
        contentType,
      },

      summary: {
        rawResponseLength:
          rawText.length,

        totalMatches:
          allMatches.length,

        extractedMatches:
          extractedMatches.length,

        showingFirst:
          firstTenMatches.length,

        showingRawExamples:
          firstThreeRawMatches.length,
      },

      matches:
        firstTenMatches,

      rawExamples:
        firstThreeRawMatches,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        test:
          "mackolik-match-extraction",

        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen hata",
      },

      {
        status: 500,
      }
    );
  }
}
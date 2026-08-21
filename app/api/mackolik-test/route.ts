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

function getNestedString(
  object: UnknownRecord,
  paths: string[][]
): string | null {
  for (const path of paths) {
    let current: unknown = object;

    for (const key of path) {
      if (!isRecord(current)) {
        current = null;
        break;
      }

      current = current[key];
    }

    if (typeof current === "string" && current.length > 0) {
      return current;
    }

    if (typeof current === "number") {
      return String(current);
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

function buildMatchSummary(match: UnknownRecord) {
  const homeTeam =
    getString(match, "homeTeam", "home", "homeName") ||
    getNestedString(match, [
      ["teams", "home", "name"],
      ["teamHome", "name"],
      ["home", "name"],
      ["participants", "home", "name"],
    ]);

  const awayTeam =
    getString(match, "awayTeam", "away", "awayName") ||
    getNestedString(match, [
      ["teams", "away", "name"],
      ["teamAway", "name"],
      ["away", "name"],
      ["participants", "away", "name"],
    ]);

  const matchName =
    getString(match, "matchName", "name", "title") ||
    (homeTeam && awayTeam ? `${homeTeam} - ${awayTeam}` : null);

  const scoreObject = isRecord(match["score"])
    ? match["score"]
    : null;

  const halfTimeObject =
    scoreObject && isRecord(scoreObject["ht"])
      ? scoreObject["ht"]
      : null;

  const homeScore =
    scoreObject && getString(scoreObject, "home", "homeScore");

  const awayScore =
    scoreObject && getString(scoreObject, "away", "awayScore");

  const halfTimeHome =
    halfTimeObject && getString(halfTimeObject, "home");

  const halfTimeAway =
    halfTimeObject && getString(halfTimeObject, "away");

  return {
    id: getString(match, "id", "key", "matchId") || null,
    objectKey: getString(match, "_objectKey"),
    matchName,
    homeTeam,
    awayTeam,
    dateTime:
      getString(
        match,
        "mstUtc",
        "startTime",
        "matchDate",
        "date",
        "dateTime"
      ) || null,
    status:
      getString(
        match,
        "status",
        "matchStatus",
        "state"
      ) || null,
    minute:
      getString(
        match,
        "minute",
        "matchMinute",
        "elapsed"
      ) || null,
    score: {
      home: homeScore,
      away: awayScore,
    },
    halfTimeScore: {
      home: halfTimeHome,
      away: halfTimeAway,
    },
    iddaaCode:
      getString(match, "iddaaCode", "iddaa", "betCode") || null,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const requestedDate =
      searchParams.get("date") ||
      new Date().toISOString().slice(0, 10);

    const targetUrl = new URL(MACKOLIK_URL);

    targetUrl.searchParams.append("sports[]", "Soccer");
    targetUrl.searchParams.set("matchDate", requestedDate);

    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
        Referer: "https://www.mackolik.com/canli-sonuclar",
        Origin: "https://www.mackolik.com",
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();

    let parsedData: unknown = null;

    try {
      parsedData = JSON.parse(rawText);
    } catch {
      parsedData = null;
    }

    if (!parsedData || !isRecord(parsedData)) {
      return NextResponse.json(
        {
          success: false,
          test: "mackolik",
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
            rawPreview: rawText.slice(0, 5000),
          },
        },
        {
          status: response.ok ? 200 : response.status,
        }
      );
    }

    const rootData = isRecord(parsedData["data"])
      ? parsedData["data"]
      : parsedData;

    const competitions = isRecord(rootData["competitions"])
      ? rootData["competitions"]
      : {};

    const competitionList = Object.entries(competitions).map(
      ([key, value]) => {
        if (!isRecord(value)) {
          return {
            id: key,
            name: null,
            country: null,
            code: null,
          };
        }

        const country = isRecord(value["country"])
          ? value["country"]
          : null;

        return {
          id: getString(value, "id") || key,
          name: getString(value, "name"),
          country: country
            ? getString(country, "name")
            : null,
          code: getString(value, "code"),
          slug: getString(value, "competitionSlug"),
          format: getString(value, "competitionFormat"),
        };
      }
    );

    const matchesContainer = findMatchesContainer(
      parsedData
    );

    const normalizedMatches = matchesContainer
      ? normalizeMatches(matchesContainer)
      : [];

    const matchSummaries = normalizedMatches.map(
      buildMatchSummary
    );

    const sampleRawMatches = normalizedMatches
      .slice(0, 3)
      .map((match) => match);

    return NextResponse.json(
      {
        success: response.ok,
        test: "mackolik",
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
          rawResponseLength: rawText.length,
          competitionsCount: competitionList.length,
          matchesFound: matchSummaries.length,
        },
        competitions: competitionList,
        matches: matchSummaries,
        sampleRawMatches,
      },
      {
        status: response.ok ? 200 : response.status,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        test: "mackolik",
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
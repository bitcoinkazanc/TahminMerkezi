import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getMatches,
  getMatch,
} from "../../../lib/football-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase environment değişkenleri eksik."
    );
  }

  return createClient(
    url,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function normalizeForDatabase(
  match
) {
  return {
    external_id:
      String(match.id),

    league:
      match.league ||
      "Mackolik",

    home_team:
      match.home_team ||
      "",

    away_team:
      match.away_team ||
      "",

    home_logo:
      match.home_logo ||
      null,

    away_logo:
      match.away_logo ||
      null,

    match_date:
      match.match_date ||
      null,

    status:
      match.status ||
      "scheduled",

    home_score:
      match.home_score,

    away_score:
      match.away_score,
  };
}

function applySourceData(
  databaseMatch,
  sourceMatch
) {
  if (!sourceMatch) {
    return databaseMatch;
  }

  return {
    ...databaseMatch,

    external_id:
      databaseMatch.external_id ??
      String(sourceMatch.id),

    league:
      sourceMatch.league ||
      databaseMatch.league,

    home_team:
      sourceMatch.home_team ||
      databaseMatch.home_team,

    away_team:
      sourceMatch.away_team ||
      databaseMatch.away_team,

    home_logo:
      sourceMatch.home_logo ||
      databaseMatch.home_logo ||
      null,

    away_logo:
      sourceMatch.away_logo ||
      databaseMatch.away_logo ||
      null,

    match_date:
      sourceMatch.match_date ||
      databaseMatch.match_date,

    status:
      sourceMatch.status ||
      databaseMatch.status,

    home_score:
      sourceMatch.home_score,

    away_score:
      sourceMatch.away_score,

    live_minute:
      sourceMatch.live_minute,

    state:
      sourceMatch.state,

    substate:
      sourceMatch.substate,

    status_box_content:
      sourceMatch.status_box_content,

    home_team_id:
      sourceMatch.home_team_id,

    away_team_id:
      sourceMatch.away_team_id,

    iddaa_code:
      sourceMatch.iddaa_code,

    source:
      "Mackolik",

    source_id:
      sourceMatch.id,
  };
}

function filterMatches(
  matches,
  searchParams
) {
  const sport =
    searchParams.get("sport");

  const status =
    searchParams.get("status");

  let result = matches;

  if (sport) {
    const wantedSport =
      sport.toLowerCase();

    result =
      result.filter(
        (match) =>
          String(
            match.sport || ""
          ).toLowerCase() ===
          wantedSport
      );
  }

  if (status) {
    const wantedStatus =
      status.toLowerCase();

    result =
      result.filter(
        (match) =>
          String(
            match.status || ""
          ).toLowerCase() ===
          wantedStatus
      );
  }

  return result;
}

async function getExistingMap(
  supabase,
  externalIds
) {
  const map = new Map();

  if (!externalIds.length) {
    return map;
  }

  const chunkSize = 100;

  for (
    let i = 0;
    i < externalIds.length;
    i += chunkSize
  ) {
    const chunk =
      externalIds.slice(
        i,
        i + chunkSize
      );

    const { data, error } =
      await supabase
        .from("matches")
        .select(
          `
            id,
            external_id,
            league,
            home_team,
            away_team,
            home_logo,
            away_logo,
            match_date,
            status,
            home_score,
            away_score
          `
        )
        .in(
          "external_id",
          chunk
        );

    if (error) {
      throw error;
    }

    for (const row of data || []) {
      if (row.external_id != null) {
        map.set(
          String(row.external_id),
          row
        );
      }
    }
  }

  return map;
}

async function insertNewMatches(
  supabase,
  matches,
  existingMap
) {
  const newMatches =
    matches.filter(
      (match) =>
        !existingMap.has(
          String(match.id)
        )
    );

  if (!newMatches.length) {
    return [];
  }

  const inserted = [];

  const rows =
    newMatches.map(
      normalizeForDatabase
    );

  const chunkSize = 50;

  for (
    let i = 0;
    i < rows.length;
    i += chunkSize
  ) {
    const chunk =
      rows.slice(
        i,
        i + chunkSize
      );

    const { data, error } =
      await supabase
        .from("matches")
        .insert(chunk)
        .select(
          `
            id,
            external_id,
            league,
            home_team,
            away_team,
            home_logo,
            away_logo,
            match_date,
            status,
            home_score,
            away_score
          `
        );

    if (error) {
      for (const row of chunk) {
        const {
          data: single,
          error: singleError,
        } = await supabase
          .from("matches")
          .insert(row)
          .select(
            `
              id,
              external_id,
              league,
              home_team,
              away_team,
              home_logo,
              away_logo,
              match_date,
              status,
              home_score,
              away_score
            `
          )
          .single();

        if (
          singleError
        ) {
          if (
            String(
              singleError.message ||
              ""
            ).toLowerCase().includes(
              "duplicate"
            )
          ) {
            continue;
          }

          console.error(
            "Match insert error:",
            singleError
          );

          continue;
        }

        if (single) {
          inserted.push(single);
        }
      }
    } else {
      inserted.push(
        ...(data || [])
      );
    }
  }

  return inserted;
}

async function updateExistingMatches(
  supabase,
  matches,
  existingMap
) {
  const updates = [];

  for (const match of matches) {
    const key =
      String(match.id);

    const existing =
      existingMap.get(key);

    if (!existing) {
      continue;
    }

    const row =
      normalizeForDatabase(
        match
      );

    const changed =
      existing.status !==
        row.status ||
      existing.home_score !==
        row.home_score ||
      existing.away_score !==
        row.away_score ||
      existing.home_team !==
        row.home_team ||
      existing.away_team !==
        row.away_team ||
      existing.home_logo !==
        row.home_logo ||
      existing.away_logo !==
        row.away_logo ||
      existing.match_date !==
        row.match_date;

    if (!changed) {
      continue;
    }

    updates.push({
      id: existing.id,
      row,
    });
  }

  if (!updates.length) {
    return;
  }

  const chunkSize = 20;

  for (
    let i = 0;
    i < updates.length;
    i += chunkSize
  ) {
    const chunk =
      updates.slice(
        i,
        i + chunkSize
      );

    await Promise.all(
      chunk.map(
        async ({
          id,
          row,
        }) => {
          const { error } =
            await supabase
              .from("matches")
              .update(row)
              .eq(
                "id",
                id
              );

          if (error) {
            console.error(
              "Match update error:",
              error
            );
          }
        }
      )
    );
  }
}

async function getDatabaseMatches(
  supabase,
  ids
) {
  if (!ids.length) {
    return [];
  }

  const result = [];

  const chunkSize = 100;

  for (
    let i = 0;
    i < ids.length;
    i += chunkSize
  ) {
    const chunk =
      ids.slice(
        i,
        i + chunkSize
      );

    const { data, error } =
      await supabase
        .from("matches")
        .select(
          `
            id,
            external_id,
            league,
            home_team,
            away_team,
            home_logo,
            away_logo,
            match_date,
            status,
            home_score,
            away_score
          `
        )
        .in(
          "external_id",
          chunk
        );

    if (error) {
      throw error;
    }

    result.push(
      ...(data || [])
    );
  }

  return result;
}

function sortMatches(
  matches
) {
  return [...matches].sort(
    (a, b) => {
      const aDate =
        a.match_date
          ? new Date(
              a.match_date
            ).getTime()
          : 0;

      const bDate =
        b.match_date
          ? new Date(
              b.match_date
            ).getTime()
          : 0;

      return aDate - bDate;
    }
  );
}

async function handleList(
  request
) {
  const searchParams =
    new URL(request.url)
      .searchParams;

  const sourceMatches =
    await getMatches();

  const filtered =
    filterMatches(
      sourceMatches,
      searchParams
    );

  const supabase =
    getSupabase();

  const externalIds =
    filtered
      .map((match) =>
        String(match.id)
      )
      .filter(Boolean);

  const existingMap =
    await getExistingMap(
      supabase,
      externalIds
    );

  const inserted =
    await insertNewMatches(
      supabase,
      filtered,
      existingMap
    );

  for (const row of inserted) {
    if (
      row?.external_id
    ) {
      existingMap.set(
        String(
          row.external_id
        ),
        row
      );
    }
  }

  await updateExistingMatches(
    supabase,
    filtered,
    existingMap
  );

  const databaseMatches =
    await getDatabaseMatches(
      supabase,
      externalIds
    );

  const sourceMap =
    new Map();

  for (const match of filtered) {
    sourceMap.set(
      String(match.id),
      match
    );
  }

  const result =
    databaseMatches.map(
      (databaseMatch) =>
        applySourceData(
          databaseMatch,
          sourceMap.get(
            String(
              databaseMatch.external_id
            )
          )
        )
    );

  return sortMatches(
    result
  );
}

async function handleSingle(
  requestedId
) {
  const supabase =
    getSupabase();

  let sourceMatch =
    await getMatch(
      requestedId
    );

  if (!sourceMatch) {
    const { data, error } =
      await supabase
        .from("matches")
        .select(
          `
            id,
            external_id,
            league,
            home_team,
            away_team,
            home_logo,
            away_logo,
            match_date,
            status,
            home_score,
            away_score
          `
        )
        .eq(
          "id",
          requestedId
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (
      data?.external_id
    ) {
      sourceMatch =
        await getMatch(
          data.external_id
        );

      if (sourceMatch) {
        return applySourceData(
          data,
          sourceMatch
        );
      }

      return data;
    }

    return null;
  }

  const externalId =
    String(
      sourceMatch.id
    );

  const existingMap =
    await getExistingMap(
      supabase,
      [externalId]
    );

  const existing =
    existingMap.get(
      externalId
    );

  if (!existing) {
    const inserted =
      await insertNewMatches(
        supabase,
        [sourceMatch],
        existingMap
      );

    if (
      inserted.length
    ) {
      return applySourceData(
        inserted[0],
        sourceMatch
      );
    }

    return sourceMatch;
  }

  await updateExistingMatches(
    supabase,
    [sourceMatch],
    existingMap
  );

  return applySourceData(
    existing,
    sourceMatch
  );
}

export async function GET(
  request
) {
  const startedAt =
    Date.now();

  try {
    const searchParams =
      new URL(request.url)
        .searchParams;

    const requestedId =
      searchParams.get("id");

    const result =
      requestedId
        ? await handleSingle(
            requestedId
          )
        : await handleList(
            request
          );

    if (
      requestedId &&
      !result
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Maç bulunamadı.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    const response =
      requestedId
        ? {
            success: true,
            match: result,
            source: "Mackolik",
            duration_ms:
              Date.now() -
              startedAt,
          }
        : {
            success: true,
            matches: result,
            source: "Mackolik",
            count: result.length,
            duration_ms:
              Date.now() -
              startedAt,
          };

    return NextResponse.json(
      response,
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
    console.error(
      "MACKOLIK MATCHES API ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        source: "Mackolik",
        error:
          error?.message ||
          "Maç verileri alınamadı.",
        duration_ms:
          Date.now() -
          startedAt,
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        "POST desteklenmiyor.",
    },
    {
      status: 405,
    }
  );
}
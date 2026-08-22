import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getMatches,
  getMatch,
} from "../../../lib/football-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeMatch(match) {
  if (!match) {
    return null;
  }

  if (!match.id) {
    return null;
  }

  if (!match.home_team || !match.away_team) {
    return null;
  }

  return {
    external_id: String(match.id),

    league:
      match.league || null,

    league_logo:
      match.league_logo || null,

    home_team:
      String(match.home_team).trim(),

    away_team:
      String(match.away_team).trim(),

    home_logo:
      match.home_logo || null,

    away_logo:
      match.away_logo || null,

    home_team_id:
      match.home_team_id || null,

    away_team_id:
      match.away_team_id || null,

    match_date:
      match.match_date || null,

    status:
      match.status || "scheduled",

    home_score:
      match.home_score !== undefined &&
      match.home_score !== null
        ? Number(match.home_score)
        : null,

    away_score:
      match.away_score !== undefined &&
      match.away_score !== null
        ? Number(match.away_score)
        : null,

    half_time_home_score:
      match.half_time_home_score !== undefined &&
      match.half_time_home_score !== null
        ? Number(match.half_time_home_score)
        : null,

    half_time_away_score:
      match.half_time_away_score !== undefined &&
      match.half_time_away_score !== null
        ? Number(match.half_time_away_score)
        : null,

    live_minute:
      match.live_minute || null,

    source:
      "Mackolik",

    source_id:
      String(match.id),

    source_status:
      match.source_status || null,

    source_state:
      match.source_state || null,

    source_substate:
      match.source_substate || null,

    status_box_content:
      match.status_box_content || null,

    competition_id:
      match.competition_id || null,

    iddaa_code:
      match.iddaa_code || null,

    live_betting:
      match.live_betting === true,

    last_updated:
      new Date().toISOString(),
  };
}

function applySportFilter(matches, sport) {
  if (!sport) {
    return matches;
  }

  return matches.filter(
    (match) =>
      String(match.sport || "football") ===
      String(sport)
  );
}

function applyStatusFilter(matches, status) {
  if (!status) {
    return matches;
  }

  return matches.filter(
    (match) =>
      String(match.status) ===
      String(status)
  );
}

async function findOrCreateMatch(
  supabase,
  sourceMatch
) {
  const externalId =
    String(sourceMatch.external_id);

  /*
   * Önce mevcut Maçkolik kaydını bul.
   *
   * Böylece mevcut Supabase UUID'si
   * korunur ve predictions.match_id
   * hiçbir zaman bozulmaz.
   */
  const {
    data: existing,
    error: findError,
  } = await supabase
    .from("matches")
    .select("id")
    .eq(
      "external_id",
      externalId
    )
    .maybeSingle();

  if (findError) {
    throw new Error(
      `Match lookup error: ${findError.message}`
    );
  }

  let matchId =
    existing?.id || null;

  if (!matchId) {
    const {
      data: inserted,
      error: insertError,
    } = await supabase
      .from("matches")
      .insert(sourceMatch)
      .select("id")
      .single();

    if (insertError) {
      /*
       * Aynı anda başka bir istek
       * kaydı oluşturmuş olabilir.
       *
       * Bu durumda tekrar buluyoruz.
       */
      const {
        data: retryExisting,
        error: retryError,
      } = await supabase
        .from("matches")
        .select("id")
        .eq(
          "external_id",
          externalId
        )
        .maybeSingle();

      if (
        retryError ||
        !retryExisting?.id
      ) {
        throw new Error(
          `Match insert error: ${
            insertError.message
          }`
        );
      }

      matchId =
        retryExisting.id;
    } else {
      matchId =
        inserted.id;
    }
  }

  /*
   * Aynı Supabase UUID'si korunarak
   * Maçkolik verisini güncelle.
   */
  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from("matches")
    .update({
      external_id:
        sourceMatch.external_id,

      league:
        sourceMatch.league,

      league_logo:
        sourceMatch.league_logo,

      home_team:
        sourceMatch.home_team,

      away_team:
        sourceMatch.away_team,

      home_logo:
        sourceMatch.home_logo,

      away_logo:
        sourceMatch.away_logo,

      home_team_id:
        sourceMatch.home_team_id,

      away_team_id:
        sourceMatch.away_team_id,

      match_date:
        sourceMatch.match_date,

      status:
        sourceMatch.status,

      home_score:
        sourceMatch.home_score,

      away_score:
        sourceMatch.away_score,

      half_time_home_score:
        sourceMatch.half_time_home_score,

      half_time_away_score:
        sourceMatch.half_time_away_score,

      live_minute:
        sourceMatch.live_minute,

      source:
        "Mackolik",

      source_id:
        sourceMatch.source_id,

      source_status:
        sourceMatch.source_status,

      source_state:
        sourceMatch.source_state,

      source_substate:
        sourceMatch.source_substate,

      status_box_content:
        sourceMatch.status_box_content,

      competition_id:
        sourceMatch.competition_id,

      iddaa_code:
        sourceMatch.iddaa_code,

      live_betting:
        sourceMatch.live_betting,

      last_updated:
        sourceMatch.last_updated,
    })
    .eq(
      "id",
      matchId
    )
    .select(`
      id,
      external_id,
      league,
      league_logo,
      home_team,
      away_team,
      home_logo,
      away_logo,
      home_team_id,
      away_team_id,
      match_date,
      status,
      home_score,
      away_score,
      half_time_home_score,
      half_time_away_score,
      live_minute,
      source,
      source_id,
      source_status,
      source_state,
      source_substate,
      status_box_content,
      competition_id,
      iddaa_code,
      live_betting,
      last_updated
    `)
    .single();

  if (updateError) {
    throw new Error(
      `Match update error: ${updateError.message}`
    );
  }

  return updated;
}

function outputMatch(match) {
  return {
    id: match.id,

    external_id:
      match.external_id,

    league:
      match.league,

    league_logo:
      match.league_logo,

    home_team:
      match.home_team,

    away_team:
      match.away_team,

    home_logo:
      match.home_logo,

    away_logo:
      match.away_logo,

    home_team_id:
      match.home_team_id,

    away_team_id:
      match.away_team_id,

    match_date:
      match.match_date,

    status:
      match.status,

    home_score:
      match.home_score,

    away_score:
      match.away_score,

    half_time_home_score:
      match.half_time_home_score,

    half_time_away_score:
      match.half_time_away_score,

    live_minute:
      match.live_minute,

    source:
      "Mackolik",

    source_id:
      match.source_id,

    source_status:
      match.source_status,

    source_state:
      match.source_state,

    source_substate:
      match.source_substate,

    status_box_content:
      match.status_box_content,

    competition_id:
      match.competition_id,

    iddaa_code:
      match.iddaa_code,

    live_betting:
      match.live_betting,

    last_updated:
      match.last_updated,
  };
}

export async function GET(request) {
  try {
    const supabase =
      getSupabase();

    const { searchParams } =
      new URL(request.url);

    const matchId =
      searchParams.get("id");

    const sport =
      searchParams.get("sport");

    const status =
      searchParams.get("status");

    /*
     * --------------------------------------------------
     * TEK MAÇ
     * --------------------------------------------------
     */
    if (matchId) {
      let sourceMatch = null;

      /*
       * Önce doğrudan Maçkolik ID olarak dene.
       */
      try {
        sourceMatch =
          await getMatch(matchId);
      } catch (error) {
        console.error(
          "Direct Mackolik match lookup error:",
          error
        );
      }

      /*
       * Eğer gelen ID Supabase UUID ise,
       * önce external_id'yi bul.
       *
       * Bu sayede eski tahminlerin
       * match_id bağlantısı korunur.
       */
      if (!sourceMatch) {
        const {
          data: databaseMatch,
          error: databaseError,
        } = await supabase
          .from("matches")
          .select(`
            id,
            external_id
          `)
          .eq(
            "id",
            matchId
          )
          .maybeSingle();

        if (databaseError) {
          console.error(
            "Database match lookup error:",
            databaseError
          );
        }

        if (
          databaseMatch?.external_id
        ) {
          try {
            sourceMatch =
              await getMatch(
                databaseMatch.external_id
              );
          } catch (error) {
            console.error(
              "Mackolik external match lookup error:",
              error
            );
          }
        }
      }

      if (!sourceMatch) {
        return NextResponse.json(
          {
            success: true,
            matches: [],
            source: "Mackolik",
          },
          {
            headers: {
              "Cache-Control":
                "no-store, no-cache, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );
      }

      /*
       * Sport filtresi varsa uygula.
       */
      if (
        sport &&
        String(
          sourceMatch.sport ||
            "football"
        ) !==
          String(sport)
      ) {
        return NextResponse.json({
          success: true,
          matches: [],
          source: "Mackolik",
        });
      }

      /*
       * Status filtresi varsa uygula.
       */
      if (
        status &&
        String(
          sourceMatch.status
        ) !== String(status)
      ) {
        return NextResponse.json({
          success: true,
          matches: [],
          source: "Mackolik",
        });
      }

      const normalized =
        normalizeMatch(
          sourceMatch
        );

      if (!normalized) {
        return NextResponse.json({
          success: true,
          matches: [],
          source: "Mackolik",
        });
      }

      /*
       * Supabase'de aynı maçın
       * mevcut UUID'sini koruyarak
       * güncelle.
       */
      const databaseMatch =
        await findOrCreateMatch(
          supabase,
          normalized
        );

      return NextResponse.json(
        {
          success: true,
          matches: [
            outputMatch(
              databaseMatch
            ),
          ],
          source: "Mackolik",
        },
        {
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    /*
     * --------------------------------------------------
     * TÜM MAÇLAR
     * --------------------------------------------------
     */
    const sourceMatches =
      await getMatches();

    let filtered =
      sourceMatches || [];

    filtered =
      applySportFilter(
        filtered,
        sport
      );

    filtered =
      applyStatusFilter(
        filtered,
        status
      );

    /*
     * Maçkolik'ten gelen her maçı
     * Supabase'e senkronize et.
     */
    const syncedMatches = [];

    for (
      const sourceMatch of filtered
    ) {
      const normalized =
        normalizeMatch(
          sourceMatch
        );

      if (!normalized) {
        continue;
      }

      try {
        const databaseMatch =
          await findOrCreateMatch(
            supabase,
            normalized
          );

        syncedMatches.push(
          outputMatch(
            databaseMatch
          )
        );
      } catch (error) {
        console.error(
          "Match sync error:",
          {
            external_id:
              normalized.external_id,
            error:
              error?.message ||
              error,
          }
        );
      }
    }

    /*
     * Tarihe göre sırala.
     */
    syncedMatches.sort(
      (a, b) => {
        if (
          !a.match_date &&
          !b.match_date
        ) {
          return 0;
        }

        if (!a.match_date) {
          return 1;
        }

        if (!b.match_date) {
          return -1;
        }

        return (
          new Date(
            a.match_date
          ).getTime() -
          new Date(
            b.match_date
          ).getTime()
        );
      }
    );

    return NextResponse.json(
      {
        success: true,

        matches:
          syncedMatches,

        source:
          "Mackolik",

        source_count:
          sourceMatches?.length ||
          0,

        filtered_count:
          filtered.length,

        synced_count:
          syncedMatches.length,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Matches GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Maçlar alınırken sunucu hatası oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Maçlar yalnızca Maçkolik üzerinden senkronize edilir.",
    },
    {
      status: 405,
    }
  );
}
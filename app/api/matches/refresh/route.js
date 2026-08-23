import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMatches } from "../../../../lib/football-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

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

function buildMatchData(match) {
  return {
    external_id:
      match.external_id
        ? String(match.external_id)
        : null,

    league:
      match.league ||
      "Mackolik",

    league_logo:
      match.league_logo ||
      null,

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
      match.home_score ??
      null,

    away_score:
      match.away_score ??
      null,

    home_team_id:
      match.home_team_id
        ? String(match.home_team_id)
        : null,

    away_team_id:
      match.away_team_id
        ? String(match.away_team_id)
        : null,
  };
}

async function syncMatch(
  supabase,
  match
) {
  if (!match?.external_id) {
    return {
      action: "skipped",
      match: null,
    };
  }

  const externalId =
    String(match.external_id);

  const {
    data: existing,
    error: findError,
  } = await supabase
    .from("matches")
    .select("id, external_id")
    .eq(
      "external_id",
      externalId
    )
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  const data =
    buildMatchData(match);

  /*
   * MAÇ YOKSA EKLE
   */
  if (!existing) {
    const {
      data: inserted,
      error: insertError,
    } = await supabase
      .from("matches")
      .insert(data)
      .select("*")
      .single();

    if (insertError) {
      throw insertError;
    }

    return {
      action: "inserted",
      match: {
        ...match,
        id: inserted.id,
        external_id:
          inserted.external_id,
      },
    };
  }

  /*
   * MAÇ VARSA GÜNCELLE
   *
   * Supabase UUID değişmez.
   */
  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from("matches")
    .update(data)
    .eq(
      "id",
      existing.id
    )
    .select("*")
    .single();

  if (updateError) {
    throw updateError;
  }

  return {
    action: "updated",
    match: {
      ...match,
      id: updated.id,
      external_id:
        updated.external_id,
    },
  };
}

export async function GET(request) {
  const startedAt =
    Date.now();

  try {
    /*
     * İsteğe bağlı güvenlik.
     *
     * CRON_SECRET varsa:
     * Authorization:
     * Bearer CRON_SECRET
     *
     * olmadan refresh çalışmaz.
     *
     * CRON_SECRET yoksa test için
     * endpoint çalışmaya devam eder.
     */
    const cronSecret =
      process.env.CRON_SECRET;

    if (cronSecret) {
      const authorization =
        request.headers.get(
          "authorization"
        );

      if (
        authorization !==
        `Bearer ${cronSecret}`
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Unauthorized",
          },
          {
            status: 401,
          }
        );
      }
    }

    const supabase =
      getSupabaseAdmin();

    /*
     * Mackolik'ten güncel
     * futbol + basketbol maçlarını al.
     */
    const matches =
      await getMatches();

    if (
      !Array.isArray(matches)
    ) {
      throw new Error(
        "Mackolik maç verisi geçersiz."
      );
    }

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    const synchronizedMatches =
      [];

    /*
     * Aynı external_id'nin
     * tekrar işlenmesini engelle.
     */
    const uniqueMatches =
      new Map();

    for (
      const match of matches
    ) {
      if (
        !match?.external_id
      ) {
        continue;
      }

      uniqueMatches.set(
        String(
          match.external_id
        ),
        match
      );
    }

    /*
     * Maçları Supabase'e aktar.
     */
    for (
      const match of
        uniqueMatches.values()
    ) {
      try {
        const result =
          await syncMatch(
            supabase,
            match
          );

        if (
          result.action ===
          "inserted"
        ) {
          inserted += 1;
        }

        if (
          result.action ===
          "updated"
        ) {
          updated += 1;
        }

        if (
          result.match
        ) {
          synchronizedMatches.push(
            result.match
          );
        }
      } catch (error) {
        failed += 1;

        console.error(
          "Maç senkronizasyon hatası:",
          {
            external_id:
              match.external_id,

            home_team:
              match.home_team,

            away_team:
              match.away_team,

            error:
              error?.message ||
              error,
          }
        );
      }
    }

    /*
     * Sonuç.
     */
    return NextResponse.json(
      {
        success: true,

        message:
          "Maçlar başarıyla yenilendi.",

        totalFetched:
          matches.length,

        uniqueMatches:
          uniqueMatches.size,

        inserted,

        updated,

        failed,

        duration_ms:
          Date.now() -
          startedAt,

        timestamp:
          new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma:
            "no-cache",

          Expires:
            "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "================================="
    );

    console.error(
      "MATCH REFRESH HATASI"
    );

    console.error(
      error
    );

    console.error(
      "================================="
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Maçlar yenilenemedi.",

        duration_ms:
          Date.now() -
          startedAt,
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",

          Pragma:
            "no-cache",

          Expires:
            "0",
        },
      }
    );
  }
}
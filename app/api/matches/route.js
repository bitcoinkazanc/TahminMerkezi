import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  getMatches,
  getMatch,
} from "../../../lib/football-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/*
 * ==========================================================
 * SUPABASE ADMIN
 * ==========================================================
 */

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(
    url,
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/*
 * ==========================================================
 * RESPONSE
 * ==========================================================
 */

function jsonResponse(
  data,
  status = 200
) {
  return NextResponse.json(
    data,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

/*
 * ==========================================================
 * SUPABASE'A GÖNDERİLECEK MAÇ VERİSİ
 * ==========================================================
 */

function buildDatabaseMatch(
  match
) {
  return {
    external_id:
      match?.external_id
        ? String(match.external_id)
        : null,

    league:
      match?.league ||
      "Mackolik",

    league_logo:
      match?.league_logo ||
      null,

    home_team:
      match?.home_team ||
      "",

    away_team:
      match?.away_team ||
      "",

    home_logo:
      match?.home_logo ||
      null,

    away_logo:
      match?.away_logo ||
      null,

    match_date:
      match?.match_date ||
      null,

    status:
      match?.status ||
      "scheduled",

    home_score:
      match?.home_score ??
      null,

    away_score:
      match?.away_score ??
      null,

    home_team_id:
      match?.home_team_id
        ? String(match.home_team_id)
        : null,

    away_team_id:
      match?.away_team_id
        ? String(match.away_team_id)
        : null,
  };
}

/*
 * ==========================================================
 * TEK MAÇI SUPABASE'E SENKRONİZE ET
 * ==========================================================
 *
 * ÖNEMLİ:
 *
 * external_id = Mackolik ID
 *
 * id = Supabase UUID
 *
 * Prediction:
 *
 * predictions.match_id
 *          ↓
 * matches.id
 *
 * Böylece mevcut prediction kayıtlarının
 * match_id değeri kesinlikle değişmez.
 */

async function syncMatchToSupabase(
  supabase,
  match
) {
  if (
    !supabase ||
    !match?.external_id
  ) {
    return {
      match,
      databaseMatch: null,
      action: "skipped",
    };
  }

  const externalId =
    String(match.external_id);

  /*
   * Önce mevcut kaydı bul.
   */
  const {
    data: existing,
    error: findError,
  } = await supabase
    .from("matches")
    .select("*")
    .eq(
      "external_id",
      externalId
    )
    .maybeSingle();

  if (findError) {
    console.error(
      "Supabase maç arama hatası:",
      {
        externalId,
        error: findError,
      }
    );

    throw findError;
  }

  const databaseData =
    buildDatabaseMatch(match);

  /*
   * ========================================================
   * MAÇ YOK → INSERT
   * ========================================================
   */

  if (!existing) {
    const {
      data: inserted,
      error: insertError,
    } = await supabase
      .from("matches")
      .insert(
        databaseData
      )
      .select("*")
      .single();

    if (insertError) {
      console.error(
        "Supabase maç INSERT hatası:",
        {
          externalId,
          databaseData,
          error: insertError,
        }
      );

      throw insertError;
    }

    return {
      match: {
        ...match,
        id:
          inserted.id,
        external_id:
          inserted.external_id,
      },

      databaseMatch:
        inserted,

      action: "inserted",
    };
  }

  /*
   * ========================================================
   * MAÇ VAR → UPDATE
   * ========================================================
   *
   * Mevcut Supabase UUID'sini koruyoruz.
   */

  const {
    data: updated,
    error: updateError,
  } = await supabase
    .from("matches")
    .update(
      databaseData
    )
    .eq(
      "id",
      existing.id
    )
    .select("*")
    .single();

  if (updateError) {
    console.error(
      "Supabase maç UPDATE hatası:",
      {
        matchId:
          existing.id,

        externalId,

        databaseData,

        error:
          updateError,
      }
    );

    throw updateError;
  }

  return {
    match: {
      ...match,

      /*
       * Kartlarda artık
       * Supabase UUID kullanılacak.
       */
      id:
        updated.id,

      external_id:
        updated.external_id,
    },

    databaseMatch:
      updated,

    action: "updated",
  };
}

/*
 * ==========================================================
 * TÜM MAÇLARI SUPABASE'E SENKRONİZE ET
 * ==========================================================
 */

async function syncMatchesToSupabase(
  supabase,
  matches
) {
  if (
    !supabase ||
    !Array.isArray(matches) ||
    matches.length === 0
  ) {
    return {
      matches,
      inserted: 0,
      updated: 0,
      failed: 0,
    };
  }

  /*
   * Aynı external_id'nin iki kere
   * gelmesini engelle.
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
      String(match.external_id),
      match
    );
  }

  const synchronized = [];

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  /*
   * Bilerek sırayla işliyoruz.
   *
   * Böylece aynı external_id için
   * yarışan INSERT işlemleri oluşmaz.
   */
  for (
    const match of
      uniqueMatches.values()
  ) {
    try {
      const result =
        await syncMatchToSupabase(
          supabase,
          match
        );

      synchronized.push(
        result.match
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
    } catch (error) {
      failed += 1;

      console.error(
        "Maç senkronizasyonu başarısız:",
        {
          externalId:
            match?.external_id,

          home:
            match?.home_team,

          away:
            match?.away_team,

          error,
        }
      );

      /*
       * Bir maçın hatası
       * diğer maçların senkronizasyonunu
       * durdurmasın.
       */

      synchronized.push(
        match
      );
    }
  }

  return {
    matches:
      synchronized,

    inserted,
    updated,
    failed,
  };
}

/*
 * ==========================================================
 * GET
 * ==========================================================
 */

export async function GET(
  request
) {
  const startedAt =
    Date.now();

  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

    const requestedId =
      searchParams.get(
        "id"
      );

    const sport =
      searchParams.get(
        "sport"
      );

    const status =
      searchParams.get(
        "status"
      );

    console.log(
      "================================="
    );

    console.log(
      "MACKOLIK /api/matches BAŞLADI"
    );

    console.log(
      "id:",
      requestedId
    );

    console.log(
      "sport:",
      sport
    );

    console.log(
      "status:",
      status
    );

    console.log(
      "================================="
    );

    const supabase =
      getSupabaseAdmin();

    /*
     * ======================================================
     * TEK MAÇ
     * ======================================================
     */

    if (requestedId) {
      console.log(
        "Tek maç isteniyor:",
        requestedId
      );

      /*
       * ----------------------------------------------------
       * 1. SUPABASE'DE ARA
       * ----------------------------------------------------
       */

      if (supabase) {
        const {
          data:
            supabaseMatch,
          error:
            supabaseError,
        } = await supabase
          .from("matches")
          .select("*")
          .or(
            `id.eq.${requestedId},external_id.eq.${requestedId}`
          )
          .maybeSingle();

        if (supabaseError) {
          console.error(
            "Supabase maç arama hatası:",
            supabaseError
          );
        }

        if (
          supabaseMatch
        ) {
          console.log(
            "Supabase maç bulundu:",
            supabaseMatch.id
          );

          /*
           * ------------------------------------------------
           * 2. MACKOLIK'TEN GÜNCEL VERİYİ AL
           * ------------------------------------------------
           */

          let freshMatch =
            null;

          if (
            supabaseMatch.external_id
          ) {
            try {
              freshMatch =
                await getMatch(
                  supabaseMatch.external_id
                );
            } catch (error) {
              console.error(
                "Mackolik güncel maç alınamadı:",
                error
              );
            }
          }

          /*
           * ------------------------------------------------
           * 3. GÜNCEL MACKOLIK VERİSİ VARSA
           *    SUPABASE'İ DE GÜNCELLE
           * ------------------------------------------------
           */

          if (
            freshMatch
          ) {
            let finalMatch =
              freshMatch;

            try {
              if (
                supabase
              ) {
                const syncResult =
                  await syncMatchToSupabase(
                    supabase,
                    freshMatch
                  );

                finalMatch =
                  syncResult.match;
              }
            } catch (error) {
              console.error(
                "Tek maç Supabase senkronizasyon hatası:",
                error
              );

              /*
               * Senkronizasyon hata verse bile
               * güncel Mackolik verisini döndür.
               */
              finalMatch = {
                ...freshMatch,

                id:
                  supabaseMatch.id,

                external_id:
                  supabaseMatch.external_id,
              };
            }

            return jsonResponse({
              success: true,

              source:
                "Mackolik+Supabase",

              match:
                finalMatch,

              duration_ms:
                Date.now() -
                startedAt,
            });
          }

          /*
           * Mackolik'ten güncel veri alınamazsa
           * mevcut Supabase kaydını döndür.
           */

          return jsonResponse({
            success: true,

            source:
              "Supabase",

            match:
              supabaseMatch,

            duration_ms:
              Date.now() -
              startedAt,
          });
        }
      }

      /*
       * ----------------------------------------------------
       * 4. SUPABASE'DE YOKSA MACKOLIK'TEN ARA
       * ----------------------------------------------------
       */

      const match =
        await getMatch(
          requestedId
        );

      console.log(
        "Mackolik tek maç sonucu:",
        match
          ? "BULUNDU"
          : "BULUNAMADI"
      );

      if (!match) {
        return jsonResponse(
          {
            success: false,

            error:
              "Maç bulunamadı.",

            source:
              "Mackolik",

            duration_ms:
              Date.now() -
              startedAt,
          },
          404
        );
      }

      /*
       * Mackolik'te bulunan ama
       * Supabase'de olmayan maçı kaydet.
       */

      let finalMatch =
        match;

      if (supabase) {
        try {
          const syncResult =
            await syncMatchToSupabase(
              supabase,
              match
            );

          finalMatch =
            syncResult.match;
        } catch (error) {
          console.error(
            "Bulunan maç Supabase'e kaydedilemedi:",
            error
          );
        }
      }

      return jsonResponse({
        success: true,

        source:
          "Mackolik+Supabase",

        match:
          finalMatch,

        duration_ms:
          Date.now() -
          startedAt,
      });
    }

    /*
     * ======================================================
     * TÜM MAÇLAR
     * ======================================================
     */

    console.log(
      "Maçkolik getMatches() çağrılıyor..."
    );

    const allMatches =
      await getMatches();

    console.log(
      "Maçkolik getMatches() tamamlandı."
    );

    console.log(
      "Toplam maç:",
      allMatches.length
    );

    /*
     * ======================================================
     * SUPABASE SENKRONİZASYONU
     * ======================================================
     *
     * KRİTİK BÖLÜM
     *
     * Artık listede bulunan her maçın
     * Supabase matches tablosunda da
     * karşılığı olacak.
     */

    let synchronizedMatches =
      allMatches;

    let insertedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    if (
      supabase &&
      allMatches.length > 0
    ) {
      const syncResult =
        await syncMatchesToSupabase(
          supabase,
          allMatches
        );

      synchronizedMatches =
        syncResult.matches;

      insertedCount =
        syncResult.inserted;

      updatedCount =
        syncResult.updated;

      failedCount =
        syncResult.failed;

      console.log(
        "Supabase senkronizasyonu:",
        {
          inserted:
            insertedCount,

          updated:
            updatedCount,

          failed:
            failedCount,
        }
      );
    }

    let matches =
      synchronizedMatches;

    /*
     * ======================================================
     * SPORT FİLTRESİ
     * ======================================================
     */

    if (sport) {
      const wantedSport =
        sport.toLowerCase();

      matches =
        matches.filter(
          (match) =>
            String(
              match?.sport ||
              ""
            ).toLowerCase() ===
            wantedSport
        );
    }

    /*
     * ======================================================
     * STATUS FİLTRESİ
     * ======================================================
     */

    if (status) {
      const wantedStatus =
        status.toLowerCase();

      matches =
        matches.filter(
          (match) =>
            String(
              match?.status ||
              ""
            ).toLowerCase() ===
            wantedStatus
        );
    }

    console.log(
      "Filtre sonrası maç:",
      matches.length
    );

    /*
     * ======================================================
     * SONUÇ
     * ======================================================
     */

    return jsonResponse({
      success: true,

      source:
        "Mackolik+Supabase",

      count:
        matches.length,

      matches,

      sync: {
        inserted:
          insertedCount,

        updated:
          updatedCount,

        failed:
          failedCount,
      },

      duration_ms:
        Date.now() -
        startedAt,
    });
  } catch (error) {
    console.error(
      "================================="
    );

    console.error(
      "MACKOLIK /api/matches HATASI"
    );

    console.error(
      error
    );

    console.error(
      "================================="
    );

    return jsonResponse(
      {
        success: false,

        source:
          "Mackolik",

        error:
          error?.message ||
          "Maç verileri alınamadı.",

        error_name:
          error?.name ||
          null,

        duration_ms:
          Date.now() -
          startedAt,
      },
      500
    );
  }
}
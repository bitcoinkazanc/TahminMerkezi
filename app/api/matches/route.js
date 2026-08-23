import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getMatches,
  getMatch,
} from "../../../lib/football-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function noCacheHeaders() {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

/*
 * ==================================================
 * TEK MAÇI SUPABASE + MACKOLIK'TEN BUL
 * ==================================================
 *
 * Gelen ID şu olabilir:
 *
 * 1. Supabase UUID
 * 2. Mackolik external_id
 * 3. İddaa kodu
 *
 * Önce Supabase'de arıyoruz.
 * Böylece kartta kullanılan Supabase UUID
 * tekrar Mackolik external_id'ye çevrilebiliyor.
 */
async function findSingleMatch(requestedId) {
  const supabase = getSupabaseAdmin();

  /*
   * --------------------------------------------------
   * 1. SUPABASE'DE UUID / EXTERNAL_ID ARAMA
   * --------------------------------------------------
   */
  if (supabase) {
    let databaseMatch = null;

    /*
     * Önce UUID olarak dene.
     */
    const {
      data: byId,
      error: byIdError,
    } = await supabase
      .from("matches")
      .select("*")
      .eq("id", requestedId)
      .maybeSingle();

    if (byIdError) {
      console.error(
        "Supabase UUID arama hatası:",
        byIdError
      );
    }

    if (byId) {
      databaseMatch = byId;
    }

    /*
     * UUID olarak bulunamadıysa external_id dene.
     */
    if (!databaseMatch) {
      const {
        data: byExternalId,
        error: byExternalError,
      } = await supabase
        .from("matches")
        .select("*")
        .eq(
          "external_id",
          requestedId
        )
        .maybeSingle();

      if (byExternalError) {
        console.error(
          "Supabase external_id arama hatası:",
          byExternalError
        );
      }

      if (byExternalId) {
        databaseMatch =
          byExternalId;
      }
    }

    /*
     * ------------------------------------------------
     * SUPABASE MAÇ BULUNDU
     * ------------------------------------------------
     */
    if (databaseMatch) {
      console.log(
        "Supabase maç bulundu:",
        databaseMatch.id
      );

      console.log(
        "Mackolik external_id:",
        databaseMatch.external_id
      );

      /*
       * External ID varsa Mackolik'ten
       * güncel maçı çek.
       */
      if (
        databaseMatch.external_id
      ) {
        try {
          const freshMatch =
            await getMatch(
              databaseMatch.external_id
            );

          if (freshMatch) {
            console.log(
              "Mackolik güncel maç bulundu:",
              freshMatch.id
            );

            /*
             * ÖNEMLİ:
             *
             * Kartta kullanılan Supabase UUID
             * korunuyor.
             */
            return {
              ...freshMatch,

              id:
                databaseMatch.id,

              external_id:
                databaseMatch.external_id,

              created_at:
                databaseMatch.created_at,

              updated_at:
                databaseMatch.updated_at,
            };
          }
        } catch (error) {
          console.error(
            "Mackolik güncel maç alınamadı:",
            error
          );
        }
      }

      /*
       * Mackolik'ten alınamazsa
       * Supabase'deki maç yine de dönsün.
       */
      return databaseMatch;
    }
  }

  /*
   * --------------------------------------------------
   * 2. SUPABASE'DE BULAMADIYSA MACKOLIK'TE ARA
   * --------------------------------------------------
   */
  try {
    const match =
      await getMatch(
        requestedId
      );

    if (match) {
      console.log(
        "Maç doğrudan Mackolik'ten bulundu:",
        match.id
      );

      /*
       * Mackolik'te bulunduysa ve Supabase
       * bağlantısı varsa UUID eşleştirmeyi dene.
       */
      if (supabase && match.external_id) {
        const {
          data: databaseMatch,
          error,
        } = await supabase
          .from("matches")
          .select("*")
          .eq(
            "external_id",
            match.external_id
          )
          .maybeSingle();

        if (error) {
          console.error(
            "Mackolik → Supabase eşleştirme hatası:",
            error
          );
        }

        if (databaseMatch) {
          return {
            ...match,

            id:
              databaseMatch.id,

            external_id:
              databaseMatch.external_id,

            created_at:
              databaseMatch.created_at,

            updated_at:
              databaseMatch.updated_at,
          };
        }
      }

      return match;
    }
  } catch (error) {
    console.error(
      "Mackolik tek maç arama hatası:",
      error
    );
  }

  return null;
}

export async function GET(request) {
  const startedAt =
    Date.now();

  try {
    const {
      searchParams,
    } = new URL(
      request.url
    );

    const requestedId =
      searchParams.get("id");

    const sport =
      searchParams.get("sport");

    const status =
      searchParams.get("status");

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

    /*
     * ==================================================
     * TEK MAÇ
     * ==================================================
     */
    if (requestedId) {
      console.log(
        "Tek maç aranıyor:",
        requestedId
      );

      const match =
        await findSingleMatch(
          requestedId
        );

      if (!match) {
        console.error(
          "MAÇ BULUNAMADI:",
          requestedId
        );

        return NextResponse.json(
          {
            success: false,

            error:
              "Maç bulunamadı.",

            requested_id:
              requestedId,

            duration_ms:
              Date.now() -
              startedAt,
          },
          {
            status: 404,
            headers:
              noCacheHeaders(),
          }
        );
      }

      console.log(
        "TEK MAÇ BULUNDU:",
        match.id
      );

      return NextResponse.json(
        {
          success: true,

          source:
            "Mackolik+Supabase",

          match,

          duration_ms:
            Date.now() -
            startedAt,
        },
        {
          headers:
            noCacheHeaders(),
        }
      );
    }

    /*
     * ==================================================
     * TÜM MAÇLAR
     * ==================================================
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

    let matches =
      allMatches;

    /*
     * ==================================================
     * SUPABASE ID EŞLEŞTİRME
     * ==================================================
     */

    const supabase =
      getSupabaseAdmin();

    if (
      supabase &&
      allMatches.length > 0
    ) {
      const externalIds =
        allMatches
          .map(
            (match) =>
              match?.external_id
          )
          .filter(Boolean);

      if (
        externalIds.length > 0
      ) {
        const {
          data:
            databaseMatches,
          error:
            databaseError,
        } = await supabase
          .from("matches")
          .select(
            "id, external_id, created_at, updated_at"
          )
          .in(
            "external_id",
            externalIds
          );

        if (databaseError) {
          console.error(
            "Supabase ID eşleştirme hatası:",
            databaseError
          );
        } else {
          const idMap =
            new Map();

          for (
            const databaseMatch of
              databaseMatches ||
              []
          ) {
            if (
              databaseMatch?.external_id &&
              databaseMatch?.id
            ) {
              idMap.set(
                String(
                  databaseMatch.external_id
                ),
                databaseMatch
              );
            }
          }

          matches =
            allMatches.map(
              (match) => {
                const databaseMatch =
                  idMap.get(
                    String(
                      match.external_id
                    )
                  );

                if (
                  !databaseMatch
                ) {
                  return match;
                }

                return {
                  ...match,

                  /*
                   * Kartlarda ve tahminlerde
                   * Supabase UUID kullanılacak.
                   */
                  id:
                    databaseMatch.id,

                  external_id:
                    match.external_id,

                  created_at:
                    databaseMatch.created_at,

                  updated_at:
                    databaseMatch.updated_at,
                };
              }
            );

          console.log(
            "Supabase ID eşleşen maç:",
            idMap.size
          );
        }
      }
    }

    /*
     * ==================================================
     * SPORT FİLTRESİ
     * ==================================================
     */

    if (sport) {
      const wantedSport =
        sport.toLowerCase();

      matches =
        matches.filter(
          (match) =>
            String(
              match.sport || ""
            ).toLowerCase() ===
            wantedSport
        );
    }

    /*
     * ==================================================
     * STATUS FİLTRESİ
     * ==================================================
     */

    if (status) {
      const wantedStatus =
        status.toLowerCase();

      matches =
        matches.filter(
          (match) =>
            String(
              match.status || ""
            ).toLowerCase() ===
            wantedStatus
        );
    }

    console.log(
      "Filtre sonrası maç:",
      matches.length
    );

    return NextResponse.json(
      {
        success: true,

        source:
          "Mackolik+Supabase",

        count:
          matches.length,

        matches,

        duration_ms:
          Date.now() -
          startedAt,
      },
      {
        headers:
          noCacheHeaders(),
      }
    );
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

    return NextResponse.json(
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
      {
        status: 500,

        headers:
          noCacheHeaders(),
      }
    );
  }
}
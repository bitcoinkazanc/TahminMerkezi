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

export async function GET(request) {
  const startedAt = Date.now();

  try {
    const { searchParams } =
      new URL(request.url);

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
        "Tek maç isteniyor:",
        requestedId
      );

      const supabase =
        getSupabaseAdmin();

      /*
       * Önce Supabase UUID veya
       * external_id ile arıyoruz.
       */
      if (supabase) {
        const {
          data: supabaseMatch,
          error: supabaseError,
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

        if (supabaseMatch) {
          console.log(
            "Supabase maç bulundu:",
            supabaseMatch.id
          );

          /*
           * Supabase external_id üzerinden
           * Mackolik'ten güncel bilgiyi almaya çalış.
           */
          let freshMatch = null;

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
           * Güncel Mackolik verisi varsa
           * Supabase UUID'sini koruyarak döndür.
           */
          if (freshMatch) {
            return NextResponse.json(
              {
                success: true,
                source:
                  "Mackolik+Supabase",
                match: {
                  ...freshMatch,

                  id:
                    supabaseMatch.id,

                  external_id:
                    supabaseMatch.external_id,

                  created_at:
                    supabaseMatch.created_at,

                  updated_at:
                    supabaseMatch.updated_at,
                },

                duration_ms:
                  Date.now() -
                  startedAt,
              },
              {
                headers: {
                  "Cache-Control":
                    "no-store, no-cache, must-revalidate, proxy-revalidate",
                  Pragma:
                    "no-cache",
                  Expires: "0",
                },
              }
            );
          }

          /*
           * Mackolik güncel veri vermezse
           * Supabase kaydını kullan.
           */
          return NextResponse.json(
            {
              success: true,
              source: "Supabase",
              match: supabaseMatch,
              duration_ms:
                Date.now() -
                startedAt,
            },
            {
              headers: {
                "Cache-Control":
                  "no-store, no-cache, must-revalidate, proxy-revalidate",
                Pragma:
                  "no-cache",
                Expires: "0",
              },
            }
          );
        }
      }

      /*
       * Supabase'de bulunamazsa
       * eski Mackolik aramasını deniyoruz.
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
        return NextResponse.json(
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
          {
            status: 404,
            headers: {
              "Cache-Control":
                "no-store, no-cache, must-revalidate, proxy-revalidate",
              Pragma:
                "no-cache",
              Expires: "0",
            },
          }
        );
      }

      return NextResponse.json(
        {
          success: true,
          source:
            "Mackolik",
          match,
          duration_ms:
            Date.now() -
            startedAt,
        },
        {
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma:
              "no-cache",
            Expires: "0",
          },
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
     *
     * Maçkolik:
     *
     * match.external_id
     *
     * Supabase:
     *
     * matches.external_id
     *
     * eşleştiğinde:
     *
     * match.id = Supabase UUID
     *
     * yapıyoruz.
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
          data: databaseMatches,
          error: databaseError,
        } = await supabase
          .from("matches")
          .select(
            "id, external_id"
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
                databaseMatch.id
              );
            }
          }

          matches =
            allMatches.map(
              (match) => {
                const supabaseId =
                  idMap.get(
                    String(
                      match.external_id
                    )
                  );

                if (!supabaseId) {
                  return match;
                }

                return {
                  ...match,

                  /*
                   * ARTIK KARTTA
                   * SUPABASE UUID
                   * KULLANILACAK
                   */
                  id: supabaseId,

                  /*
                   * Mackolik ID
                   * ayrıca korunuyor.
                   */
                  external_id:
                    match.external_id,
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
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma:
            "no-cache",
          Expires: "0",
        },
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

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma:
            "no-cache",
          Expires: "0",
        },
      }
    );
  }
}
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

      /*
       * Önce Supabase'den arıyoruz.
       *
       * MatchCard URL'si:
       *
       * /mac/SUPABASE_UUID
       *
       * Bu nedenle matches.id üzerinden
       * doğrudan bulabiliriz.
       *
       * Ayrıca external_id üzerinden de arıyoruz.
       * Böylece eski Maçkolik ID linkleri de çalışır.
       */

      const supabase =
        getSupabaseAdmin();

      if (supabase) {
        console.log(
          "Supabase üzerinden maç aranıyor..."
        );

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
           * Supabase kaydı bulundu.
           *
           * Ancak canlı skor / güncel durum
           * Mackolik'ten gelmeye devam etsin.
           *
           * external_id üzerinden Mackolik'teki
           * güncel maçı bulmayı deniyoruz.
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
           * Mackolik'ten güncel veri geldiyse
           * Supabase UUID'sini koruyoruz.
           *
           * Böylece predictions.match_id
           * ile bağlantı bozulmuyor.
           */

          if (freshMatch) {
            const mergedMatch = {
              ...freshMatch,

              id:
                supabaseMatch.id,

              external_id:
                supabaseMatch.external_id ||
                freshMatch.external_id,

              created_at:
                supabaseMatch.created_at,

              updated_at:
                supabaseMatch.updated_at,
            };

            return NextResponse.json(
              {
                success: true,
                source: "Mackolik+Supabase",
                match: mergedMatch,
                duration_ms:
                  Date.now() - startedAt,
              },
              {
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
           * Mackolik'ten güncel veri alınamazsa
           * Supabase'deki kayıt yine de gösterilir.
           *
           * Bu özellikle bitmiş/eski maçlarda
           * "Maç bulunamadı" sorununu engeller.
           */

          return NextResponse.json(
            {
              success: true,
              source: "Supabase",
              match: supabaseMatch,
              duration_ms:
                Date.now() - startedAt,
            },
            {
              headers: {
                "Cache-Control":
                  "no-store, no-cache, must-revalidate, proxy-revalidate",
                Pragma: "no-cache",
                Expires: "0",
              },
            }
          );
        }
      }

      /*
       * Supabase'de bulunamadıysa
       * mevcut Mackolik sistemini deniyoruz.
       */

      console.log(
        "Supabase'de bulunamadı. Mackolik aranıyor..."
      );

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
            source: "Mackolik",
            duration_ms:
              Date.now() - startedAt,
          },
          {
            status: 404,
            headers: {
              "Cache-Control":
                "no-store, no-cache, must-revalidate, proxy-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );
      }

      return NextResponse.json(
        {
          success: true,
          source: "Mackolik",
          match,
          duration_ms:
            Date.now() - startedAt,
        },
        {
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
        source: "Mackolik",
        count:
          matches.length,
        matches,
        duration_ms:
          Date.now() - startedAt,
      },
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
        source: "Mackolik",
        error:
          error?.message ||
          "Maç verileri alınamadı.",
        error_name:
          error?.name || null,
        duration_ms:
          Date.now() - startedAt,
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}
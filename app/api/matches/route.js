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

/*
 * --------------------------------------------------
 * YARDIMCI FONKSİYONLAR
 * --------------------------------------------------
 */

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function getMatchTimestamp(match) {
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const candidates = [
    match.match_date,
    match.matchDate,
    match.date,
    match.start_time,
    match.startTime,
  ];

  for (const value of candidates) {
    if (!value) {
      continue;
    }

    const timestamp =
      new Date(value).getTime();

    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  return Number.MAX_SAFE_INTEGER;
}

function getLiveMinute(match) {
  if (!match) {
    return null;
  }

  const candidates = [
    match.live_minute,
    match.liveMinute,
    match.minute,
    match.currentMinute,
    match.current_minute,
  ];

  for (const value of candidates) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue;
    }

    const numeric =
      Number(value);

    if (
      Number.isFinite(numeric) &&
      numeric >= 0 &&
      numeric <= 200
    ) {
      return Math.floor(numeric);
    }
  }

  return null;
}

function isLiveMatch(match) {
  if (!match) {
    return false;
  }

  const status =
    normalizeText(match.status);

  const state =
    normalizeText(match.state);

  return (
    status === "live" ||
    status === "canlı" ||
    status === "inplay" ||
    status === "in-play" ||
    state === "live" ||
    state === "canlı" ||
    state === "inplay" ||
    state === "in-play"
  );
}

function isFinishedMatch(match) {
  if (!match) {
    return false;
  }

  const status =
    normalizeText(match.status);

  const state =
    normalizeText(match.state);

  return (
    status === "finished" ||
    status === "completed" ||
    status === "fulltime" ||
    status === "full-time" ||
    status === "ended" ||
    status === "bitmiş" ||
    status === "bitti" ||
    state === "finished" ||
    state === "completed" ||
    state === "fulltime" ||
    state === "full-time" ||
    state === "ended" ||
    state === "bitmiş" ||
    state === "bitti"
  );
}

function isTurkishLeague(match) {
  if (!match) {
    return false;
  }

  const league =
    normalizeText(match.league);

  const leagueId =
    normalizeText(match.league_id);

  const competitionId =
    normalizeText(match.competition_id);

  const country =
    normalizeText(
      match.country ||
      match.country_name ||
      match.league_country
    );

  /*
   * Türkiye / Turkey ifadeleri.
   */
  if (
    league.includes("türkiye") ||
    league.includes("turkiye") ||
    league.includes("türkiye") ||
    league.includes("turkey") ||
    country.includes("türkiye") ||
    country.includes("turkiye") ||
    country.includes("turkey")
  ) {
    return true;
  }

  /*
   * Yaygın Türkiye ligleri.
   */
  const turkishLeagueKeywords = [
    "süper lig",
    "super lig",
    "1. lig",
    "1 lig",
    "2. lig",
    "2 lig",
    "3. lig",
    "3 lig",
    "tff",
    "zıraat",
    "ziraat",
    "türkiye kupası",
    "turkiye kupasi",
    "türkiye süper kupası",
    "turkiye super kupasi",
  ];

  if (
    turkishLeagueKeywords.some(
      (keyword) =>
        league.includes(keyword)
    )
  ) {
    return true;
  }

  /*
   * Bazı Mackolik verilerinde ülke/lig
   * doğrudan görünmeyebilir.
   *
   * Bu durumda takım isimlerine göre
   * Türkiye tespiti yapmıyoruz.
   *
   * Çünkü yanlış pozitif üretmemek daha doğru.
   */
  if (
    leagueId === "turkey" ||
    competitionId === "turkey"
  ) {
    return true;
  }

  return false;
}

/*
 * --------------------------------------------------
 * MAÇ SIRALAMA
 * --------------------------------------------------
 *
 * ÖNCELİK:
 *
 * 1. Canlı Türkiye maçları
 * 2. Diğer canlı maçlar
 * 3. Yaklaşan maçlar
 * 4. Bitmiş maçlar
 *
 * CANLI MAÇLAR:
 *
 * dakika büyük -> üstte
 *
 * örnek:
 *
 * 87'
 * 72'
 * 45'
 * 12'
 * dakika bilgisi yok
 *
 * Dakika bilgisi olmayan canlı maçlar
 * yine canlı grubunda kalır.
 */

function sortMatches(matches) {
  if (
    !Array.isArray(matches)
  ) {
    return [];
  }

  return [...matches].sort(
    (a, b) => {
      const aLive =
        isLiveMatch(a);

      const bLive =
        isLiveMatch(b);

      const aFinished =
        isFinishedMatch(a);

      const bFinished =
        isFinishedMatch(b);

      /*
       * --------------------------------------------
       * CANLI / CANLI OLMAYAN GRUPLAMA
       * --------------------------------------------
       */

      if (
        aLive &&
        !bLive
      ) {
        return -1;
      }

      if (
        !aLive &&
        bLive
      ) {
        return 1;
      }

      /*
       * --------------------------------------------
       * İKİSİ DE CANLI
       * --------------------------------------------
       */

      if (
        aLive &&
        bLive
      ) {
        const aTurkish =
          isTurkishLeague(a);

        const bTurkish =
          isTurkishLeague(b);

        /*
         * Türkiye canlı maçları
         * diğer canlılardan önce.
         */
        if (
          aTurkish &&
          !bTurkish
        ) {
          return -1;
        }

        if (
          !aTurkish &&
          bTurkish
        ) {
          return 1;
        }

        /*
         * Dakika bilgisi.
         */
        const aMinute =
          getLiveMinute(a);

        const bMinute =
          getLiveMinute(b);

        /*
         * İkisinin de dakikası varsa:
         *
         * büyük dakika üstte.
         */
        if (
          aMinute !== null &&
          bMinute !== null
        ) {
          if (
            aMinute !== bMinute
          ) {
            return (
              bMinute -
              aMinute
            );
          }
        }

        /*
         * Dakikası olan canlı maç,
         * dakikası olmayandan önce.
         */
        if (
          aMinute !== null &&
          bMinute === null
        ) {
          return -1;
        }

        if (
          aMinute === null &&
          bMinute !== null
        ) {
          return 1;
        }

        /*
         * Dakika eşitse maç başlangıç
         * zamanına bak.
         */
        const aTime =
          getMatchTimestamp(a);

        const bTime =
          getMatchTimestamp(b);

        if (
          aTime !== bTime
        ) {
          return (
            aTime - bTime
          );
        }

        return 0;
      }

      /*
       * --------------------------------------------
       * CANLI DEĞİL
       * --------------------------------------------
       */

      /*
       * Bitmiş maçlar en alta.
       */
      if (
        aFinished &&
        !bFinished
      ) {
        return 1;
      }

      if (
        !aFinished &&
        bFinished
      ) {
        return -1;
      }

      /*
       * İkisi de bitmişse:
       * en son biten üstte.
       */
      if (
        aFinished &&
        bFinished
      ) {
        const aTime =
          getMatchTimestamp(a);

        const bTime =
          getMatchTimestamp(b);

        return (
          bTime - aTime
        );
      }

      /*
       * --------------------------------------------
       * PLANLANAN MAÇLAR
       * --------------------------------------------
       *
       * Başlama zamanı yakın olan üstte.
       */
      const aTime =
        getMatchTimestamp(a);

      const bTime =
        getMatchTimestamp(b);

      return (
        aTime - bTime
      );
    }
  );
}

/*
 * --------------------------------------------------
 * TEK MAÇ / TÜM MAÇLAR
 * --------------------------------------------------
 */

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
        } =
          await supabase
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

          let freshMatch =
            null;

          /*
           * external_id varsa
           * Mackolik'ten güncel maçı almaya çalış.
           */
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

                  Expires:
                    "0",
                },
              }
            );
          }

          return NextResponse.json(
            {
              success: true,

              source:
                "Supabase",

              match:
                supabaseMatch,

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

                Expires:
                  "0",
              },
            }
          );
        }
      }

      /*
       * Supabase'de bulunamazsa
       * Mackolik'ten ara.
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

              Expires:
                "0",
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

            Expires:
              "0",
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
        } =
          await supabase
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

                  id:
                    supabaseId,

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
        normalizeText(
          sport
        );

      matches =
        matches.filter(
          (match) =>
            normalizeText(
              match.sport
            ) === wantedSport
        );
    }

    /*
     * ==================================================
     * STATUS FİLTRESİ
     * ==================================================
     */

    if (status) {
      const wantedStatus =
        normalizeText(
          status
        );

      matches =
        matches.filter(
          (match) =>
            normalizeText(
              match.status
            ) === wantedStatus
        );
    }

    /*
     * ==================================================
     * YENİ MAÇ SIRALAMASI
     * ==================================================
     */

    matches =
      sortMatches(
        matches
      );

    console.log(
      "Filtre sonrası maç:",
      matches.length
    );

    /*
     * Debug için ilk 15 maçı göster.
     */
    console.log(
      "İlk sıralanan maçlar:",
      matches
        .slice(0, 15)
        .map(
          (match) => ({
            id:
              match.id,

            league:
              match.league,

            home:
              match.home_team,

            away:
              match.away_team,

            status:
              match.status,

            state:
              match.state,

            minute:
              getLiveMinute(
                match
              ),

            turkish:
              isTurkishLeague(
                match
              ),
          })
        )
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

          Expires:
            "0",
        },
      }
    );
  }
}
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
 * ==================================================
 * SUPABASE ADMIN
 * ==================================================
 */

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
 * ==================================================
 * CACHE HEADERS
 * ==================================================
 */

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
 * STATUS NORMALIZATION
 * ==================================================
 */

function normalizeStatus(match) {
  const status = String(
    match?.status || ""
  ).toLowerCase().trim();

  /*
   * Canlı durumlar
   */

  const liveStatuses = [
    "live",
    "1h",
    "2h",
    "ht",
    "et",
    "p",
    "pen",
    "inplay",
    "in_play",
    "playing",
  ];

  if (
    liveStatuses.includes(status)
  ) {
    return "live";
  }

  /*
   * Bitmiş durumlar
   */

  const finishedStatuses = [
    "finished",
    "ft",
    "ended",
    "completed",
    "final",
  ];

  if (
    finishedStatuses.includes(status)
  ) {
    return "finished";
  }

  /*
   * Başlamamış
   */

  const scheduledStatuses = [
    "scheduled",
    "upcoming",
    "not_started",
    "not-started",
    "ns",
  ];

  if (
    scheduledStatuses.includes(status)
  ) {
    return "scheduled";
  }

  return "other";
}


/*
 * ==================================================
 * CANLI DAKİKA BULMA
 * ==================================================
 *
 * Mackolik verisindeki alan adı değişebilir.
 * Birkaç olası alanı kontrol ediyoruz.
 */

function getLiveMinute(match) {
  const possibleValues = [
    match?.minute,
    match?.elapsed,
    match?.elapsed_minute,
    match?.match_minute,
    match?.current_minute,
    match?.live_minute,
    match?.game_minute,
    match?.timer,
  ];

  for (
    const value of possibleValues
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      continue;
    }

    /*
     * "45+2" gibi değerler
     */

    const text =
      String(value).trim();

    const matchResult =
      text.match(/^(\d+)/);

    if (matchResult) {
      const minute =
        Number(matchResult[1]);

      if (
        Number.isFinite(minute)
      ) {
        return minute;
      }
    }

    /*
     * Direkt sayı
     */

    const numberValue =
      Number(value);

    if (
      Number.isFinite(numberValue)
    ) {
      return numberValue;
    }
  }

  return null;
}


/*
 * ==================================================
 * TARİH
 * ==================================================
 */

function getMatchTimestamp(match) {
  const value =
    match?.match_date ||
    match?.date ||
    match?.start_time ||
    match?.kickoff ||
    null;

  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timestamp =
    new Date(value).getTime();

  if (
    Number.isNaN(timestamp)
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  return timestamp;
}


/*
 * ==================================================
 * TÜRKİYE LİGİ ÖNCELİĞİ
 * ==================================================
 *
 * Türkiye liglerini diğer liglerden
 * önce göstermek için kullanılıyor.
 */

function isTurkeyLeague(match) {
  const league =
    String(
      match?.league || ""
    ).toLowerCase();

  const homeTeam =
    String(
      match?.home_team || ""
    ).toLowerCase();

  const awayTeam =
    String(
      match?.away_team || ""
    ).toLowerCase();

  const turkeyKeywords = [
    "süper lig",
    "super lig",
    "1. lig",
    "2. lig",
    "3. lig",
    "türkiye",
    "turkiye",
    "tff",
    "kupası",
    "kupa",
  ];

  if (
    turkeyKeywords.some(
      (keyword) =>
        league.includes(keyword)
    )
  ) {
    return true;
  }

  /*
   * Türkiye takımlarından bazıları
   * lig adı eksik geldiğinde de
   * öncelik verebilmek için.
   */

  const turkeyTeams = [
    "galatasaray",
    "fenerbahçe",
    "fenerbahce",
    "beşiktaş",
    "besiktas",
    "trabzonspor",
    "başakşehir",
    "basaksehir",
    "konyaspor",
    "antalyaspor",
    "alanyaspor",
    "kayserispor",
    "samsunspor",
    "göztepe",
    "goztepe",
    "kasımpaşa",
    "kasimpasa",
    "gaziantep",
    "çaykur rizespor",
    "rizespor",
    "eyüpspor",
    "eyupspor",
    "adana demirspor",
    "hatayspor",
    "bodrumspor",
  ];

  return turkeyTeams.some(
    (team) =>
      league.includes(team) ||
      homeTeam.includes(team) ||
      awayTeam.includes(team)
  );
}


/*
 * ==================================================
 * MAÇ SIRALAMA
 * ==================================================
 *
 * Sıralama:
 *
 * 1. CANLI
 * 2. BAŞLAMAMIŞ
 * 3. DİĞER
 * 4. BİTMİŞ
 *
 * Canlı:
 * büyük dakika -> küçük dakika
 *
 * Başlamamış:
 * en yakın başlangıç -> uzak başlangıç
 *
 * Bitmiş:
 * en son biten -> eski
 */

function sortMatches(matches) {
  const now =
    Date.now();

  return [...matches].sort(
    (a, b) => {
      const statusA =
        normalizeStatus(a);

      const statusB =
        normalizeStatus(b);

      /*
       * ==================================================
       * 1. STATUS GRUBU
       * ==================================================
       */

      const groupOrder = {
        live: 0,
        scheduled: 1,
        other: 2,
        finished: 3,
      };

      const groupA =
        groupOrder[statusA] ??
        2;

      const groupB =
        groupOrder[statusB] ??
        2;

      if (
        groupA !== groupB
      ) {
        return (
          groupA - groupB
        );
      }


      /*
       * ==================================================
       * 2. CANLI MAÇLAR
       * ==================================================
       */

      if (
        statusA === "live" &&
        statusB === "live"
      ) {
        const minuteA =
          getLiveMinute(a);

        const minuteB =
          getLiveMinute(b);

        /*
         * Dakika bilgisi varsa
         * büyük dakika önce.
         */

        if (
          minuteA !== null &&
          minuteB !== null &&
          minuteA !== minuteB
        ) {
          return (
            minuteB - minuteA
          );
        }

        /*
         * Sadece birinde dakika
         * bilgisi varsa onu öne al.
         */

        if (
          minuteA !== null &&
          minuteB === null
        ) {
          return -1;
        }

        if (
          minuteA === null &&
          minuteB !== null
        ) {
          return 1;
        }

        /*
         * Dakika yoksa maç başlangıç
         * zamanına bak.
         */

        const timeA =
          getMatchTimestamp(a);

        const timeB =
          getMatchTimestamp(b);

        if (
          timeA !== timeB
        ) {
          return (
            timeA - timeB
          );
        }

        /*
         * Türkiye ligi önceliği
         */

        const turkeyA =
          isTurkeyLeague(a);

        const turkeyB =
          isTurkeyLeague(b);

        if (
          turkeyA !== turkeyB
        ) {
          return turkeyA
            ? -1
            : 1;
        }

        return 0;
      }


      /*
       * ==================================================
       * 3. BAŞLAMAMIŞ MAÇLAR
       * ==================================================
       */

      if (
        statusA === "scheduled" &&
        statusB === "scheduled"
      ) {
        const timeA =
          getMatchTimestamp(a);

        const timeB =
          getMatchTimestamp(b);

        /*
         * En yakın maç üstte.
         */

        if (
          timeA !== timeB
        ) {
          return (
            timeA - timeB
          );
        }

        /*
         * Aynı saatte Türkiye ligi
         * öncelikli.
         */

        const turkeyA =
          isTurkeyLeague(a);

        const turkeyB =
          isTurkeyLeague(b);

        if (
          turkeyA !== turkeyB
        ) {
          return turkeyA
            ? -1
            : 1;
        }

        return 0;
      }


      /*
       * ==================================================
       * 4. BİTMİŞ MAÇLAR
       * ==================================================
       */

      if (
        statusA === "finished" &&
        statusB === "finished"
      ) {
        const timeA =
          getMatchTimestamp(a);

        const timeB =
          getMatchTimestamp(b);

        /*
         * En yeni biten maç üstte.
         */

        if (
          timeA !== timeB
        ) {
          return (
            timeB - timeA
          );
        }

        return 0;
      }


      /*
       * ==================================================
       * 5. DİĞER
       * ==================================================
       */

      const timeA =
        getMatchTimestamp(a);

      const timeB =
        getMatchTimestamp(b);

      return (
        timeA - timeB
      );
    }
  );
}


/*
 * ==================================================
 * GET
 * ==================================================
 */

export async function GET(request) {
  const startedAt =
    Date.now();

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
           * Mackolik'ten güncel bilgi
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
           * Güncel Mackolik verisi varsa
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
                headers:
                  noCacheHeaders(),
              }
            );
          }

          /*
           * Mackolik veri vermezse
           * Supabase kaydını döndür.
           */

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
              headers:
                noCacheHeaders(),
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

            headers:
              noCacheHeaders(),
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


    /*
     * ==================================================
     * MAÇLARI SIRALA
     * ==================================================
     */

    matches =
      sortMatches(matches);


    /*
     * ==================================================
     * SIRALAMA LOG
     * ==================================================
     */

    console.log(
      "Filtre sonrası maç:",
      matches.length
    );

    console.log(
      "İlk 10 maç sıralaması:"
    );

    matches
      .slice(0, 10)
      .forEach(
        (match, index) => {
          console.log(
            index + 1,
            "|",
            normalizeStatus(match),
            "|",
            getLiveMinute(match),
            "|",
            match?.league,
            "|",
            match?.home_team,
            "-",
            match?.away_team,
            "|",
            match?.match_date
          );
        }
      );


    /*
     * ==================================================
     * RESPONSE
     * ==================================================
     */

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
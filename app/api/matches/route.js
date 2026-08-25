import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  getMatches,
  getSearchMatches,
  getMatch,
} from "../../../lib/football-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/*
 * ==================================================
 * SUPABASE
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
 * METİN NORMALİZASYONU
 * ==================================================
 */

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

/*
 * ==================================================
 * MAÇ ZAMANI
 * ==================================================
 */

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

/*
 * ==================================================
 * CANLI DAKİKA
 * ==================================================
 */

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

    const numeric = Number(value);

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

/*
 * ==================================================
 * MAÇ DURUMLARI
 * ==================================================
 */

function getMatchFlags(match) {
  if (!match) {
    return {
      live: false,
      finished: false,
    };
  }

  const status =
    normalizeText(match.status);

  const state =
    normalizeText(match.state);

  const live =
    status === "live" ||
    status === "canlı" ||
    status === "inplay" ||
    status === "in-play" ||
    state === "live" ||
    state === "canlı" ||
    state === "inplay" ||
    state === "in-play";

  const finished =
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
    state === "bitti";

  return {
    live,
    finished,
  };
}

function isLiveMatch(match) {
  return getMatchFlags(match).live;
}

function isFinishedMatch(match) {
  return getMatchFlags(match).finished;
}

/*
 * ==================================================
 * TÜRKİYE LİGİ KONTROLÜ
 * ==================================================
 */

function isTurkishLeague(match) {
  if (!match) {
    return false;
  }

  const league =
    normalizeText(match.league);

  const leagueId =
    normalizeText(match.league_id);

  const competitionId =
    normalizeText(
      match.competition_id
    );

  const country =
    normalizeText(
      match.country ||
        match.country_name ||
        match.league_country
    );

  if (
    league.includes("türkiye") ||
    league.includes("turkiye") ||
    league.includes("turkey") ||
    country.includes("türkiye") ||
    country.includes("turkiye") ||
    country.includes("turkey")
  ) {
    return true;
  }

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

  for (
    const keyword of
      turkishLeagueKeywords
  ) {
    if (league.includes(keyword)) {
      return true;
    }
  }

  return (
    leagueId === "turkey" ||
    competitionId === "turkey"
  );
}

/*
 * ==================================================
 * MAÇ SIRALAMA
 * ==================================================
 *
 * Öncelik:
 *
 * 1. Canlı maçlar
 * 2. Canlı Türk maçları
 * 3. Canlı dakika
 * 4. Yaklaşan maçlar
 * 5. Biten maçlar
 *
 * Burada her karşılaştırmada tekrar tekrar
 * aynı bilgileri hesaplamamak için önce
 * yardımcı verileri hazırlıyoruz.
 */

function sortMatches(matches) {
  if (
    !Array.isArray(matches) ||
    matches.length <= 1
  ) {
    return Array.isArray(matches)
      ? matches
      : [];
  }

  const prepared =
    matches.map(
      (match, index) => {
        const flags =
          getMatchFlags(match);

        return {
          match,
          index,
          live: flags.live,
          finished: flags.finished,
          turkish:
            flags.live
              ? isTurkishLeague(match)
              : false,
          minute:
            flags.live
              ? getLiveMinute(match)
              : null,
          timestamp:
            getMatchTimestamp(match),
        };
      }
    );

  prepared.sort(
    (a, b) => {
      /*
       * CANLI
       */

      if (
        a.live &&
        !b.live
      ) {
        return -1;
      }

      if (
        !a.live &&
        b.live
      ) {
        return 1;
      }

      if (
        a.live &&
        b.live
      ) {
        /*
         * Türk maçları önce
         */

        if (
          a.turkish &&
          !b.turkish
        ) {
          return -1;
        }

        if (
          !a.turkish &&
          b.turkish
        ) {
          return 1;
        }

        /*
         * Canlı dakika
         */

        if (
          a.minute !== null &&
          b.minute !== null &&
          a.minute !==
            b.minute
        ) {
          return (
            b.minute -
            a.minute
          );
        }

        if (
          a.minute !== null &&
          b.minute === null
        ) {
          return -1;
        }

        if (
          a.minute === null &&
          b.minute !== null
        ) {
          return 1;
        }

        return (
          a.timestamp -
          b.timestamp
        );
      }

      /*
       * BİTEN
       */

      if (
        a.finished &&
        !b.finished
      ) {
        return 1;
      }

      if (
        !a.finished &&
        b.finished
      ) {
        return -1;
      }

      /*
       * İkisi de bittiyse
       * en yeni biten önce
       */

      if (
        a.finished &&
        b.finished
      ) {
        return (
          b.timestamp -
          a.timestamp
        );
      }

      /*
       * YAKLAŞAN
       */

      const timeDifference =
        a.timestamp -
        b.timestamp;

      if (
        timeDifference !== 0
      ) {
        return timeDifference;
      }

      /*
       * Stabil sıralama
       */

      return a.index - b.index;
    }
  );

  return prepared.map(
    (item) =>
      item.match
  );
}

/*
 * ==================================================
 * SUPABASE ID EŞLEŞTİRME
 * ==================================================
 *
 * Mackolik:
 *
 * external_id
 *
 * Supabase:
 *
 * matches.id
 *
 * Tek sorguda toplu eşleştirme.
 */

async function attachSupabaseIds(
  matches,
  supabase
) {
  if (
    !supabase ||
    !Array.isArray(matches) ||
    matches.length === 0
  ) {
    return matches;
  }

  /*
   * Tekrarlanan external_id'leri
   * temizle.
   */

  const externalIds =
    Array.from(
      new Set(
        matches
          .map(
            (match) =>
              match?.external_id
                ? String(
                    match.external_id
                  ).trim()
                : null
          )
          .filter(Boolean)
      )
    );

  if (
    externalIds.length === 0
  ) {
    return matches;
  }

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

    /*
     * Supabase ID alınamasa bile
     * Mackolik maçlarını göstermeye devam et.
     */

    return matches;
  }

  if (
    !Array.isArray(
      databaseMatches
    ) ||
    databaseMatches.length === 0
  ) {
    return matches;
  }

  const idMap =
    new Map();

  for (
    const databaseMatch of
      databaseMatches
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

  if (idMap.size === 0) {
    return matches;
  }

  return matches.map(
    (match) => {
      const externalId =
        match?.external_id
          ? String(
              match.external_id
            )
          : "";

      const supabaseId =
        idMap.get(
          externalId
        );

      if (!supabaseId) {
        return match;
      }

      return {
        ...match,
        id: supabaseId,
      };
    }
  );
}

/*
 * ==================================================
 * CACHE-CONTROL
 * ==================================================
 *
 * Mevcut sistemin canlı veri davranışını
 * bozmamak için no-store korunuyor.
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
 * GET
 * ==================================================
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

    const search =
      searchParams.get(
        "search"
      );

    const hasSearch =
      Boolean(
        search &&
          search.trim()
      );

    /*
     * ==================================================
     * TEK MAÇ
     * ==================================================
     */

    if (requestedId) {
      const supabase =
        getSupabaseAdmin();

      /*
       * Önce Supabase.
       */

      if (supabase) {
        const {
          data:
            supabaseMatch,
          error:
            supabaseError,
        } =
          await supabase
            .from("matches")
            .select("*")
            .or(
              `id.eq.${requestedId},external_id.eq.${requestedId}`
            )
            .maybeSingle();

        if (
          supabaseError
        ) {
          console.error(
            "Supabase maç arama hatası:",
            supabaseError
          );
        }

        if (
          supabaseMatch
        ) {
          /*
           * Mackolik'ten güncel veri
           * alınmaya devam ediyor.
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
            } catch (
              error
            ) {
              console.error(
                "Mackolik güncel maç alınamadı:",
                error
              );
            }
          }

          if (
            freshMatch
          ) {
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
       * Supabase'te yoksa
       * direkt Mackolik.
       */

      const match =
        await getMatch(
          requestedId
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
     * MAÇ LİSTESİ
     * ==================================================
     */

    let allMatches;

    if (hasSearch) {
      allMatches =
        await getSearchMatches();
    } else {
      allMatches =
        await getMatches();
    }

    if (
      !Array.isArray(
        allMatches
      )
    ) {
      allMatches = [];
    }

    /*
     * Supabase bağlantısı yalnızca
     * listeyi ID ile eşleştirmek için kullanılıyor.
     */

    const supabase =
      getSupabaseAdmin();

    let matches =
      await attachSupabaseIds(
        allMatches,
        supabase
      );

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
              match?.sport
            ) ===
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
        normalizeText(
          status
        );

      matches =
        matches.filter(
          (match) =>
            normalizeText(
              match?.status
            ) ===
            wantedStatus
        );
    }

    /*
     * ==================================================
     * ARAMA
     * ==================================================
     */

    if (hasSearch) {
      const searchText =
        normalizeText(
          search
        );

      if (searchText) {
        matches =
          matches.filter(
            (match) => {
              const homeTeam =
                normalizeText(
                  match?.home_team
                );

              const awayTeam =
                normalizeText(
                  match?.away_team
                );

              const league =
                normalizeText(
                  match?.league
                );

              return (
                homeTeam.includes(
                  searchText
                ) ||
                awayTeam.includes(
                  searchText
                ) ||
                league.includes(
                  searchText
                )
              );
            }
          );
      }
    }

    /*
     * ==================================================
     * SIRALA
     * ==================================================
     */

    matches =
      sortMatches(
        matches
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
          hasSearch
            ? "Mackolik+Supabase+Search"
            : "Mackolik+Supabase",
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
      "MACKOLIK /api/matches HATASI:",
      error
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
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
 * YARDIMCILAR
 * ==========================================================
 */

function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function normalizeSport(value) {
  const sport =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    sport === "basketball" ||
    sport === "basket"
  ) {
    return "basketball";
  }

  return "football";
}

function normalizeStatus(value) {
  const status =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    status === "live" ||
    status === "inplay" ||
    status === "in-play"
  ) {
    return "live";
  }

  if (
    status === "finished" ||
    status === "completed" ||
    status === "fulltime" ||
    status === "full_time"
  ) {
    return "finished";
  }

  if (
    status === "postponed"
  ) {
    return "postponed";
  }

  if (
    status === "cancelled" ||
    status === "canceled"
  ) {
    return "cancelled";
  }

  return "scheduled";
}

/*
 * ==========================================================
 * MAÇI SUPABASE FORMATINA ÇEVİR
 * ==========================================================
 *
 * DİKKAT:
 *
 * Mevcut matches tablosundaki sütunlar kullanılıyor.
 *
 * id:
 * Supabase tarafından otomatik UUID oluşturulur.
 *
 * external_id:
 * Mackolik maç ID'sidir.
 */

function buildDatabaseMatch(
  match
) {
  if (
    !match ||
    !match.external_id
  ) {
    return null;
  }

  const matchDate =
    match.match_date
      ? new Date(
          match.match_date
        )
      : null;

  if (
    !matchDate ||
    Number.isNaN(
      matchDate.getTime()
    )
  ) {
    return null;
  }

  return {
    external_id:
      String(
        match.external_id
      ),

    league:
      match.league ||
      "Mackolik",

    league_logo:
      match.league_logo ||
      null,

    home_team:
      String(
        match.home_team || ""
      ).trim(),

    away_team:
      String(
        match.away_team || ""
      ).trim(),

    home_logo:
      match.home_logo ||
      null,

    away_logo:
      match.away_logo ||
      null,

    match_date:
      matchDate.toISOString(),

    status:
      normalizeStatus(
        match.status
      ),

    home_score:
      toNumber(
        match.home_score
      ),

    away_score:
      toNumber(
        match.away_score
      ),

    home_team_id:
      match.home_team_id
        ? String(
            match.home_team_id
          )
        : null,

    away_team_id:
      match.away_team_id
        ? String(
            match.away_team_id
          )
        : null,
  };
}

/*
 * ==========================================================
 * TEK MAÇI SUPABASE'E YAZ
 * ==========================================================
 */

async function syncSingleMatch(
  supabase,
  match
) {
  if (
    !supabase ||
    !match?.external_id
  ) {
    return match;
  }

  const databaseMatch =
    buildDatabaseMatch(
      match
    );

  if (!databaseMatch) {
    return match;
  }

  const {
    data,
    error,
  } = await supabase
    .from("matches")
    .upsert(
      databaseMatch,
      {
        onConflict:
          "external_id",
      }
    )
    .select(
      "id,external_id"
    )
    .single();

  if (error) {
    console.error(
      "Tek maç Supabase sync hatası:",
      error
    );

    /*
     * Supabase yazılamasa bile
     * canlı Mackolik verisini kaybetme.
     */
    return match;
  }

  return {
    ...match,

    id:
      data?.id ||
      match.id,

    external_id:
      data?.external_id ||
      match.external_id,
  };
}

/*
 * ==========================================================
 * TÜM MAÇLARI TOPLU SUPABASE SYNC
 * ==========================================================
 *
 * ESKİ SİSTEM:
 *
 * Maç 1 → SELECT → UPDATE
 * Maç 2 → SELECT → UPDATE
 * Maç 3 → SELECT → UPDATE
 * ...
 *
 * Bu çok yavaştı.
 *
 * YENİ SİSTEM:
 *
 * Bütün maçlar → TEK UPSERT
 *
 * Böylece yüzlerce maç için
 * yüzlerce ayrı DB sorgusu yapılmaz.
 */

async function syncAllMatches(
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

  const uniqueMap =
    new Map();

  for (
    const match of matches
  ) {
    if (
      !match?.external_id
    ) {
      continue;
    }

    const databaseMatch =
      buildDatabaseMatch(
        match
      );

    if (!databaseMatch) {
      continue;
    }

    uniqueMap.set(
      String(
        match.external_id
      ),
      {
        source: match,
        database: databaseMatch,
      }
    );
  }

  const entries =
    Array.from(
      uniqueMap.values()
    );

  if (
    entries.length === 0
  ) {
    return {
      matches,
      inserted: 0,
      updated: 0,
      failed: 0,
    };
  }

  const databaseRows =
    entries.map(
      (entry) =>
        entry.database
    );

  /*
   * TEK TOPLU UPSERT
   */
  const {
    data: savedRows,
    error,
  } = await supabase
    .from("matches")
    .upsert(
      databaseRows,
      {
        onConflict:
          "external_id",
      }
    )
    .select(
      "id,external_id"
    );

  if (error) {
    console.error(
      "Toplu maç Supabase sync hatası:",
      error
    );

    /*
     * Veri kaynağından gelen maçları
     * yine de göstermeye devam ediyoruz.
     */
    return {
      matches,
      inserted: 0,
      updated: 0,
      failed:
        entries.length,
    };
  }

  const idMap =
    new Map();

  for (
    const row of
      savedRows || []
  ) {
    if (
      row?.external_id &&
      row?.id
    ) {
      idMap.set(
        String(
          row.external_id
        ),
        row.id
      );
    }
  }

  const synchronized =
    matches.map(
      (match) => {
        const supabaseId =
          idMap.get(
            String(
              match?.external_id
            )
          );

        if (!supabaseId) {
          return match;
        }

        return {
          ...match,

          /*
           * Tahminler tablosu
           * matches.id UUID'sine bağlı.
           */
          id:
            supabaseId,

          external_id:
            match.external_id,
        };
      }
    );

  return {
    matches:
      synchronized,

    /*
     * Upsert sonucu insert/update
     * ayrımı her zaman güvenilir şekilde
     * dönmediğinden toplam başarılı kayıt
     * olarak raporluyoruz.
     */
    inserted:
      savedRows?.length || 0,

    updated: 0,

    failed: 0,
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

    const sportParam =
      searchParams.get(
        "sport"
      );

    const statusParam =
      searchParams.get(
        "status"
      );

    const limitParam =
      searchParams.get(
        "limit"
      );

    const supabase =
      getSupabaseAdmin();

    /*
     * ======================================================
     * TEK MAÇ
     * ======================================================
     */

    if (requestedId) {
      const requested =
        String(
          requestedId
        );

      /*
       * 1. Önce Supabase UUID
       * veya external_id ile ara.
       */
      if (supabase) {
        const {
          data: existing,
          error,
        } = await supabase
          .from("matches")
          .select("*")
          .or(
            `id.eq.${requested},external_id.eq.${requested}`
          )
          .maybeSingle();

        if (error) {
          console.error(
            "Tek maç Supabase arama hatası:",
            error
          );
        }

        if (existing) {
          /*
           * Mackolik'ten güncel veriyi al.
           */
          let freshMatch =
            null;

          try {
            freshMatch =
              await getMatch(
                existing.external_id
              );
          } catch (error) {
            console.error(
              "Tek maç Mackolik güncelleme hatası:",
              error
            );
          }

          /*
           * Güncel Mackolik verisi varsa
           * Supabase'i de güncelle.
           */
          if (freshMatch) {
            const synced =
              await syncSingleMatch(
                supabase,
                freshMatch
              );

            return jsonResponse({
              success: true,

              source:
                "Mackolik+Supabase",

              match: {
                ...synced,

                id:
                  existing.id,
              },

              duration_ms:
                Date.now() -
                startedAt,
            });
          }

          /*
           * Mackolik geçici cevap vermiyorsa
           * mevcut Supabase kaydı kullanılabilir.
           */
          return jsonResponse({
            success: true,

            source:
              "Supabase",

            match:
              existing,

            duration_ms:
              Date.now() -
              startedAt,
          });
        }
      }

      /*
       * Supabase'de yoksa Mackolik'ten ara.
       */
      let match =
        null;

      try {
        match =
          await getMatch(
            requested
          );
      } catch (error) {
        console.error(
          "Mackolik tek maç arama hatası:",
          error
        );
      }

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
       * Bulunan maçı Supabase'e kaydet.
       */
      if (supabase) {
        match =
          await syncSingleMatch(
            supabase,
            match
          );
      }

      return jsonResponse({
        success: true,

        source:
          "Mackolik+Supabase",

        match,

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
      "Mackolik getMatches() başlıyor..."
    );

    /*
     * Burada bütün futbol +
     * basketbol verisi alınır.
     */
    const allMatches =
      await getMatches();

    console.log(
      "Mackolik maç sayısı:",
      allMatches.length
    );

    /*
     * ======================================================
     * SPORT FİLTRESİ
     * ======================================================
     */

    let matches =
      allMatches.filter(
        (match) => {
          if (!sportParam) {
            return true;
          }

          return (
            normalizeSport(
              match?.sport
            ) ===
            normalizeSport(
              sportParam
            )
          );
        }
      );

    /*
     * ======================================================
     * STATUS FİLTRESİ
     * ======================================================
     */

    if (statusParam) {
      const wantedStatus =
        normalizeStatus(
          statusParam
        );

      matches =
        matches.filter(
          (match) =>
            normalizeStatus(
              match?.status
            ) ===
            wantedStatus
        );
    }

    /*
     * ======================================================
     * SUPABASE TOPLU SYNC
     * ======================================================
     */

    let syncInfo = {
      inserted: 0,
      updated: 0,
      failed: 0,
    };

    if (
      supabase &&
      matches.length > 0
    ) {
      const syncResult =
        await syncAllMatches(
          supabase,
          matches
        );

      matches =
        syncResult.matches;

      syncInfo = {
        inserted:
          syncResult.inserted,

        updated:
          syncResult.updated,

        failed:
          syncResult.failed,
      };
    }

    /*
     * ======================================================
     * SIRALAMA
     * ======================================================
     *
     * Canlı maçlar önce.
     *
     * Canlı maçlarda:
     * dakika büyük olan üstte.
     *
     * Örnek:
     *
     * 87'
     * 71'
     * 45'
     * 23'
     *
     * Dakikası bilinmeyen canlı maçlar
     * yine canlı bölümünde kalır.
     *
     * Sonra başlayacak maçlar:
     * başlangıç saatine göre.
     */

    matches.sort(
      (a, b) => {
        const statusA =
          normalizeStatus(
            a?.status
          );

        const statusB =
          normalizeStatus(
            b?.status
          );

        const liveA =
          statusA === "live";

        const liveB =
          statusB === "live";

        /*
         * Canlı maçlar en üstte.
         */
        if (
          liveA &&
          !liveB
        ) {
          return -1;
        }

        if (
          !liveA &&
          liveB
        ) {
          return 1;
        }

        /*
         * İki maç da canlıysa
         * dakika büyük olan üstte.
         */
        if (
          liveA &&
          liveB
        ) {
          const minuteA =
            Number.isFinite(
              Number(
                a?.live_minute
              )
            )
              ? Number(
                  a.live_minute
                )
              : -1;

          const minuteB =
            Number.isFinite(
              Number(
                b?.live_minute
              )
            )
              ? Number(
                  b.live_minute
                )
              : -1;

          if (
            minuteA !==
            minuteB
          ) {
            return (
              minuteB -
              minuteA
            );
          }
        }

        const dateA =
          new Date(
            a?.match_date
          ).getTime();

        const dateB =
          new Date(
            b?.match_date
          ).getTime();

        const validA =
          Number.isFinite(
            dateA
          );

        const validB =
          Number.isFinite(
            dateB
          );

        if (
          validA &&
          validB
        ) {
          return (
            dateA -
            dateB
          );
        }

        if (validA) {
          return -1;
        }

        if (validB) {
          return 1;
        }

        return 0;
      }
    );

    /*
     * ======================================================
     * LIMIT
     * ======================================================
     */

    let finalMatches =
      matches;

    if (limitParam) {
      const requestedLimit =
        Number(
          limitParam
        );

      if (
        Number.isFinite(
          requestedLimit
        ) &&
        requestedLimit > 0
      ) {
        finalMatches =
          matches.slice(
            0,
            Math.floor(
              requestedLimit
            )
          );
      }
    }

    console.log(
      "Maç listesi hazır:",
      finalMatches.length,
      "maç"
    );

    return jsonResponse({
      success: true,

      source:
        "Mackolik+Supabase",

      count:
        finalMatches.length,

      total_source_matches:
        allMatches.length,

      matches:
        finalMatches,

      sync: syncInfo,

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

/*
 * ==========================================================
 * POST
 * ==========================================================
 *
 * Manuel maç eklemek / güncellemek için korunuyor.
 */

export async function POST(
  request
) {
  try {
    const body =
      await request.json();

    const {
      external_id,
      league,
      league_logo,
      home_team,
      away_team,
      home_logo,
      away_logo,
      match_date,
      status = "scheduled",
      home_score,
      away_score,
      home_team_id,
      away_team_id,
    } = body || {};

    if (
      !home_team ||
      !away_team ||
      !match_date
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            "Ev sahibi, deplasman ve maç tarihi zorunludur.",
        },
        400
      );
    }

    const parsedDate =
      new Date(
        match_date
      );

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            "Geçersiz maç tarihi.",
        },
        400
      );
    }

    const validStatuses = [
      "scheduled",
      "upcoming",
      "live",
      "finished",
      "postponed",
      "cancelled",
    ];

    const normalized =
      normalizeStatus(
        status
      );

    if (
      !validStatuses.includes(
        status
      ) &&
      !validStatuses.includes(
        normalized
      )
    ) {
      return jsonResponse(
        {
          success: false,

          error:
            "Geçersiz maç durumu.",
        },
        400
      );
    }

    const supabase =
      getSupabaseAdmin();

    if (!supabase) {
      return jsonResponse(
        {
          success: false,

          error:
            "Supabase bağlantısı yapılandırılmamış.",
        },
        500
      );
    }

    const matchData = {
      external_id:
        external_id
          ? String(
              external_id
            )
          : null,

      league:
        league ||
        "Mackolik",

      league_logo:
        league_logo ||
        null,

      home_team:
        String(
          home_team
        ).trim(),

      away_team:
        String(
          away_team
        ).trim(),

      home_logo:
        home_logo ||
        null,

      away_logo:
        away_logo ||
        null,

      match_date:
        parsedDate.toISOString(),

      status:
        normalizeStatus(
          status
        ),

      home_score:
        toNumber(
          home_score
        ),

      away_score:
        toNumber(
          away_score
        ),

      home_team_id:
        home_team_id
          ? String(
              home_team_id
            )
          : null,

      away_team_id:
        away_team_id
          ? String(
              away_team_id
            )
          : null,
    };

    let result;

    if (external_id) {
      result =
        await supabase
          .from("matches")
          .upsert(
            matchData,
            {
              onConflict:
                "external_id",
            }
          )
          .select("*")
          .single();
    } else {
      result =
        await supabase
          .from("matches")
          .insert(
            matchData
          )
          .select("*")
          .single();
    }

    if (result.error) {
      console.error(
        "Matches POST error:",
        result.error
      );

      return jsonResponse(
        {
          success: false,

          error:
            result.error.message,
        },
        500
      );
    }

    return jsonResponse(
      {
        success: true,

        match:
          result.data,
      },
      201
    );
  } catch (error) {
    console.error(
      "Matches POST server error:",
      error
    );

    return jsonResponse(
      {
        success: false,

        error:
          error?.message ||
          "Maç kaydedilirken sunucu hatası oluştu.",
      },
      500
    );
  }
}
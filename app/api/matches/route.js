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
  if (!match?.id) {
    return null;
  }

  return {
    external_id: String(match.id),

    league: match.league || null,

    home_team:
      match.home_team ||
      "Ev Sahibi",

    away_team:
      match.away_team ||
      "Deplasman",

    home_logo:
      match.home_logo || null,

    away_logo:
      match.away_logo || null,

    match_date:
      match.match_date || null,

    status:
      match.status || "scheduled",

    home_score:
      match.home_score !== null &&
      match.home_score !== undefined
        ? Number(match.home_score)
        : null,

    away_score:
      match.away_score !== null &&
      match.away_score !== undefined
        ? Number(match.away_score)
        : null,
  };
}

function filterMatches(matches, sport, status) {
  let result = Array.isArray(matches)
    ? matches
    : [];

  if (sport) {
    result = result.filter(
      (match) =>
        String(
          match.sport || "football"
        ).toLowerCase() ===
        String(sport).toLowerCase()
    );
  }

  if (status) {
    result = result.filter(
      (match) =>
        String(match.status).toLowerCase() ===
        String(status).toLowerCase()
    );
  }

  return result;
}

/*
 * Supabase'teki mevcut maçları
 * küçük gruplar halinde buluyoruz.
 *
 * Büyük .in() sorgusu kullanmıyoruz.
 */
async function getExistingMatches(
  supabase,
  externalIds
) {
  const result = new Map();

  const chunkSize = 100;

  for (
    let i = 0;
    i < externalIds.length;
    i += chunkSize
  ) {
    const chunk =
      externalIds.slice(
        i,
        i + chunkSize
      );

    const {
      data,
      error,
    } = await supabase
      .from("matches")
      .select(`
        id,
        external_id
      `)
      .in(
        "external_id",
        chunk
      );

    if (error) {
      throw new Error(
        `Existing matches lookup error: ${error.message}`
      );
    }

    for (
      const row of data || []
    ) {
      if (row.external_id) {
        result.set(
          String(row.external_id),
          row.id
        );
      }
    }
  }

  return result;
}

/*
 * Yeni maçları toplu ekle.
 */
async function insertNewMatches(
  supabase,
  matches
) {
  if (!matches.length) {
    return [];
  }

  const insertedIds = [];

  const chunkSize = 50;

  for (
    let i = 0;
    i < matches.length;
    i += chunkSize
  ) {
    const chunk =
      matches.slice(
        i,
        i + chunkSize
      );

    const {
      data,
      error,
    } = await supabase
      .from("matches")
      .insert(chunk)
      .select(`
        id,
        external_id
      `);

    if (error) {
      console.error(
        "New matches insert error:",
        error
      );

      /*
       * Tek bir kayıt problemliyse
       * bütün işlemi durdurmuyoruz.
       */
      for (
        const match of chunk
      ) {
        try {
          const {
            data: single,
            error:
              singleError,
          } = await supabase
            .from("matches")
            .insert(match)
            .select(`
              id,
              external_id
            `)
            .single();

          if (
            !singleError &&
            single
          ) {
            insertedIds.push(
              single
            );
          }
        } catch (singleInsertError) {
          console.error(
            "Single match insert error:",
            singleInsertError
          );
        }
      }

      continue;
    }

    for (
      const row of data || []
    ) {
      insertedIds.push(row);
    }
  }

  return insertedIds;
}

/*
 * Mevcut maçların skor/status bilgilerini
 * toplu olarak güncelle.
 *
 * UUID kesinlikle değiştirilmez.
 */
async function updateExistingMatches(
  supabase,
  matches,
  existingMap
) {
  const updatedIds = [];

  for (
    const match of matches
  ) {
    const matchId =
      existingMap.get(
        String(match.external_id)
      );

    if (!matchId) {
      continue;
    }

    const {
      data,
      error,
    } = await supabase
      .from("matches")
      .update({
        league:
          match.league,

        home_team:
          match.home_team,

        away_team:
          match.away_team,

        home_logo:
          match.home_logo,

        away_logo:
          match.away_logo,

        match_date:
          match.match_date,

        status:
          match.status,

        home_score:
          match.home_score,

        away_score:
          match.away_score,
      })
      .eq(
        "id",
        matchId
      )
      .select(`
        id,
        external_id
      `)
      .single();

    if (error) {
      console.error(
        "Match update error:",
        {
          matchId,
          externalId:
            match.external_id,
          error:
            error.message,
        }
      );

      continue;
    }

    if (data) {
      updatedIds.push(data);
    }
  }

  return updatedIds;
}

async function getDatabaseMatches(
  supabase,
  ids
) {
  if (!ids.length) {
    return [];
  }

  const result = [];

  const chunkSize = 100;

  for (
    let i = 0;
    i < ids.length;
    i += chunkSize
  ) {
    const chunk =
      ids.slice(
        i,
        i + chunkSize
      );

    const {
      data,
      error,
    } = await supabase
      .from("matches")
      .select(`
        id,
        external_id,
        league,
        home_team,
        away_team,
        home_logo,
        away_logo,
        match_date,
        status,
        home_score,
        away_score
      `)
      .in(
        "id",
        chunk
      );

    if (error) {
      throw new Error(
        `Database matches lookup error: ${error.message}`
      );
    }

    result.push(
      ...(data || [])
    );
  }

  return result;
}

function mergeSourceData(
  databaseMatch,
  sourceMatch
) {
  return {
    ...databaseMatch,

    /*
     * Canlı dakika ve diğer Mackolik
     * alanları Supabase kolonuna ihtiyaç
     * olmadan API cevabına ekleniyor.
     */
    live_minute:
      sourceMatch?.live_minute ||
      null,

    home_team_id:
      sourceMatch?.home_team_id ||
      null,

    away_team_id:
      sourceMatch?.away_team_id ||
      null,

    source:
      "Mackolik",

    source_id:
      sourceMatch?.id
        ? String(sourceMatch.id)
        : databaseMatch.external_id,
  };
}

export async function GET(request) {
  try {
    const supabase =
      getSupabase();

    const { searchParams } =
      new URL(request.url);

    const requestedId =
      searchParams.get("id");

    const sport =
      searchParams.get("sport");

    const status =
      searchParams.get("status");

    /*
     * ==========================================
     * TEK MAÇ
     * ==========================================
     */
    if (requestedId) {
      let sourceMatch = null;

      /*
       * Önce verilen ID'yi doğrudan
       * Maçkolik ID olarak deniyoruz.
       */
      try {
        sourceMatch =
          await getMatch(
            requestedId
          );
      } catch (error) {
        console.error(
          "Mackolik direct match error:",
          error
        );
      }

      /*
       * Bulunamazsa verilen ID'nin
       * Supabase UUID olma ihtimalini
       * kontrol ediyoruz.
       */
      if (!sourceMatch) {
        const {
          data: databaseMatch,
          error,
        } = await supabase
          .from("matches")
          .select(`
            id,
            external_id
          `)
          .eq(
            "id",
            requestedId
          )
          .maybeSingle();

        if (error) {
          console.error(
            "Database match lookup error:",
            error
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
              "Mackolik external ID error:",
              error
            );
          }
        }
      }

      if (!sourceMatch) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Maç bulunamadı.",
            source:
              "Mackolik",
          },
          {
            status: 404,
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        );
      }

      const normalized =
        normalizeMatch(
          sourceMatch
        );

      if (!normalized) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Maç verisi geçersiz.",
          },
          {
            status: 500,
          }
        );
      }

      const existingMap =
        await getExistingMatches(
          supabase,
          [
            normalized.external_id,
          ]
        );

      let databaseMatch;

      if (
        existingMap.has(
          normalized.external_id
        )
      ) {
        const matchId =
          existingMap.get(
            normalized.external_id
          );

        const {
          data,
          error,
        } = await supabase
          .from("matches")
          .update({
            league:
              normalized.league,

            home_team:
              normalized.home_team,

            away_team:
              normalized.away_team,

            home_logo:
              normalized.home_logo,

            away_logo:
              normalized.away_logo,

            match_date:
              normalized.match_date,

            status:
              normalized.status,

            home_score:
              normalized.home_score,

            away_score:
              normalized.away_score,
          })
          .eq(
            "id",
            matchId
          )
          .select(`
            id,
            external_id,
            league,
            home_team,
            away_team,
            home_logo,
            away_logo,
            match_date,
            status,
            home_score,
            away_score
          `)
          .single();

        if (error) {
          throw new Error(
            error.message
          );
        }

        databaseMatch =
          data;
      } else {
        const {
          data,
          error,
        } = await supabase
          .from("matches")
          .insert(
            normalized
          )
          .select(`
            id,
            external_id,
            league,
            home_team,
            away_team,
            home_logo,
            away_logo,
            match_date,
            status,
            home_score,
            away_score
          `)
          .single();

        if (error) {
          throw new Error(
            error.message
          );
        }

        databaseMatch =
          data;
      }

      return NextResponse.json(
        {
          success: true,
          matches: [
            mergeSourceData(
              databaseMatch,
              sourceMatch
            ),
          ],
          source:
            "Mackolik",
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
     * ==========================================
     * TÜM MAÇLAR
     * ==========================================
     */

    const sourceMatches =
      await getMatches();

    if (
      !Array.isArray(
        sourceMatches
      )
    ) {
      return NextResponse.json(
        {
          success: true,
          matches: [],
          source:
            "Mackolik",
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const filteredMatches =
      filterMatches(
        sourceMatches,
        sport,
        status
      );

    const normalizedMatches =
      filteredMatches
        .map(
          normalizeMatch
        )
        .filter(Boolean);

    if (
      normalizedMatches.length === 0
    ) {
      return NextResponse.json(
        {
          success: true,
          matches: [],
          source:
            "Mackolik",
          source_count:
            sourceMatches.length,
          filtered_count: 0,
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    /*
     * Mevcut maçları bul.
     */
    const externalIds =
      normalizedMatches.map(
        (match) =>
          match.external_id
      );

    const existingMap =
      await getExistingMatches(
        supabase,
        externalIds
      );

    /*
     * Yeni ve mevcut maçları ayır.
     */
    const newMatches = [];

    for (
      const match of
        normalizedMatches
    ) {
      if (
        !existingMap.has(
          match.external_id
        )
      ) {
        newMatches.push(
          match
        );
      }
    }

    /*
     * Yeni maçları ekle.
     */
    const inserted =
      await insertNewMatches(
        supabase,
        newMatches
      );

    for (
      const row of inserted
    ) {
      if (
        row?.external_id &&
        row?.id
      ) {
        existingMap.set(
          String(
            row.external_id
          ),
          row.id
        );
      }
    }

    /*
     * Mevcut maçların bilgilerini
     * güncelle.
     *
     * UUID değişmez.
     */
    await updateExistingMatches(
      supabase,
      normalizedMatches,
      existingMap
    );

    /*
     * Güncel DB kayıtlarını al.
     */
    const databaseIds =
      normalizedMatches
        .map(
          (match) =>
            existingMap.get(
              match.external_id
            )
        )
        .filter(Boolean);

    const databaseMatches =
      await getDatabaseMatches(
        supabase,
        databaseIds
      );

    const databaseMap =
      new Map(
        databaseMatches.map(
          (match) => [
            String(
              match.external_id
            ),
            match,
          ]
        )
      );

    /*
     * Maçkolik verisi + Supabase UUID
     * birleştiriliyor.
     */
    const finalMatches =
      normalizedMatches
        .map(
          (sourceMatch) => {
            const dbMatch =
              databaseMap.get(
                sourceMatch.external_id
              );

            if (!dbMatch) {
              return null;
            }

            return mergeSourceData(
              dbMatch,
              sourceMatches.find(
                (item) =>
                  String(
                    item.id
                  ) ===
                  String(
                    sourceMatch.external_id
                  )
              )
            );
          }
        )
        .filter(Boolean);

    /*
     * Tarihe göre sırala.
     */
    finalMatches.sort(
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
          finalMatches,

        source:
          "Mackolik",

        source_count:
          sourceMatches.length,

        filtered_count:
          filteredMatches.length,

        synced_count:
          finalMatches.length,
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
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Maçlar yalnızca Maçkolik üzerinden alınır.",
    },
    {
      status: 405,
    }
  );
}
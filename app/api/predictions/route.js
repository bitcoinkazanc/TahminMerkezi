import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  getMatch,
} from "../../../lib/football-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
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

/*
 * ==================================================
 * MAÇ VERİSİNİ SUPABASE FORMATINA ÇEVİR
 * ==================================================
 */

function buildDatabaseMatch(
  match
) {
  return {
    external_id:
      match?.external_id
        ? String(
            match.external_id
          )
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
        ? String(
            match.home_team_id
          )
        : null,

    away_team_id:
      match?.away_team_id
        ? String(
            match.away_team_id
          )
        : null,
  };
}

/*
 * ==================================================
 * MAÇ BULMA
 * ==================================================
 *
 * Gelen match_id:
 *
 * 1. Mackolik ID olabilir
 * 2. Supabase matches.id olabilir
 *
 * Öncelik:
 *
 * matches.external_id
 *        ↓
 * matches.id
 *        ↓
 * Mackolik'ten bul
 *        ↓
 * Supabase'e kaydet
 *        ↓
 * gerçek Supabase matches.id döndür
 *
 * iddaa_code KULLANILMAZ.
 */

async function findMatch(
  supabase,
  matchId
) {
  if (
    matchId === null ||
    matchId === undefined
  ) {
    return null;
  }

  const requestedId =
    String(matchId).trim();

  if (!requestedId) {
    return null;
  }

  /*
   * --------------------------------------------------
   * 1. MACKOLIK ID → external_id
   * --------------------------------------------------
   */

  const {
    data: externalMatch,
    error: externalError,
  } = await supabase
    .from("matches")
    .select(
      `
        id,
        external_id,
        league,
        home_team,
        away_team,
        home_logo,
        away_logo,
        match_date,
        status
      `
    )
    .eq(
      "external_id",
      requestedId
    )
    .maybeSingle();

  if (externalError) {
    console.error(
      "Match external_id lookup error:",
      externalError
    );

    throw externalError;
  }

  if (externalMatch) {
    return externalMatch;
  }

  /*
   * --------------------------------------------------
   * 2. DOĞRUDAN SUPABASE MATCH ID
   * --------------------------------------------------
   */

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    uuidRegex.test(
      requestedId
    )
  ) {
    const {
      data: uuidMatch,
      error: uuidError,
    } = await supabase
      .from("matches")
      .select(
        `
          id,
          external_id,
          league,
          home_team,
          away_team,
          home_logo,
          away_logo,
          match_date,
          status
        `
      )
      .eq(
        "id",
        requestedId
      )
      .maybeSingle();

    if (uuidError) {
      console.error(
        "Match UUID lookup error:",
        uuidError
      );

      throw uuidError;
    }

    if (uuidMatch) {
      return uuidMatch;
    }
  }

  /*
   * --------------------------------------------------
   * 3. SUPABASE'DE YOKSA MACKOLIK'TEN BUL
   * --------------------------------------------------
   */

  let mackolikMatch = null;

  try {
    mackolikMatch =
      await getMatch(
        requestedId
      );
  } catch (error) {
    console.error(
      "Mackolik match lookup error:",
      error
    );
  }

  if (!mackolikMatch) {
    return null;
  }

  const externalId =
    mackolikMatch?.external_id
      ? String(
          mackolikMatch.external_id
        ).trim()
      : null;

  if (!externalId) {
    console.error(
      "Mackolik match has no external_id:",
      mackolikMatch
    );

    return null;
  }

  /*
   * --------------------------------------------------
   * 4. TEKRAR KONTROL
   * --------------------------------------------------
   */

  const {
    data: existingAfterFetch,
    error:
      existingAfterFetchError,
  } = await supabase
    .from("matches")
    .select(
      `
        id,
        external_id,
        league,
        home_team,
        away_team,
        home_logo,
        away_logo,
        match_date,
        status
      `
    )
    .eq(
      "external_id",
      externalId
    )
    .maybeSingle();

  if (
    existingAfterFetchError
  ) {
    console.error(
      "Match second external_id lookup error:",
      existingAfterFetchError
    );

    throw existingAfterFetchError;
  }

  if (existingAfterFetch) {
    return existingAfterFetch;
  }

  /*
   * --------------------------------------------------
   * 5. MAÇI SUPABASE'E EKLE
   * --------------------------------------------------
   */

  const databaseMatch =
    buildDatabaseMatch(
      mackolikMatch
    );

  const {
    data: insertedMatch,
    error: insertError,
  } = await supabase
    .from("matches")
    .insert(
      databaseMatch
    )
    .select(
      `
        id,
        external_id,
        league,
        home_team,
        away_team,
        home_logo,
        away_logo,
        match_date,
        status
      `
    )
    .single();

  if (insertError) {
    console.error(
      "Match INSERT error:",
      insertError
    );

    const {
      data: retryMatch,
      error:
        retryError,
    } = await supabase
      .from("matches")
      .select(
        `
          id,
          external_id,
          league,
          home_team,
          away_team,
          home_logo,
          away_logo,
          match_date,
          status
        `
      )
      .eq(
        "external_id",
        externalId
      )
      .maybeSingle();

    if (
      retryError
    ) {
      console.error(
        "Match retry lookup error:",
        retryError
      );

      throw insertError;
    }

    if (retryMatch) {
      return retryMatch;
    }

    throw insertError;
  }

  return insertedMatch;
}

/*
 * ==================================================
 * GET
 * ==================================================
 */

export async function GET(
  request
) {
  try {
    const supabase =
      getSupabase();

    const {
      searchParams,
    } = new URL(
      request.url
    );

    const matchId =
      searchParams.get(
        "match_id"
      );

    const userId =
      searchParams.get(
        "user_id"
      );

    let query =
      supabase
        .from("predictions")
        .select(
          `
            id,
            prediction,
            confidence,
            message,
            created_at,
            user_id,
            match_id,
            result,
            points,

            users (
              id,
              telegram_id,
              username,
              first_name,
              last_name,
              avatar_url
            ),

            matches (
              id,
              external_id,
              league,
              home_team,
              away_team,
              home_logo,
              away_logo,
              match_date,
              status
            )
          `
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (matchId) {
      const match =
        await findMatch(
          supabase,
          matchId
        );

      if (!match) {
        return NextResponse.json({
          success: true,
          predictions: [],
        });
      }

      query =
        query.eq(
          "match_id",
          match.id
        );
    }

    if (userId) {
      query =
        query.eq(
          "user_id",
          userId
        );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(
        "Predictions GET error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      predictions:
        data || [],
    });
  } catch (error) {
    console.error(
      "Predictions GET server error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Tahminler alınırken bir sunucu hatası oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ==================================================
 * POST
 * ==================================================
 */

export async function POST(
  request
) {
  try {
    const body =
      await request.json();

    const userId =
      body?.user_id;

    const matchId =
      body?.match_id;

    const prediction =
      body?.prediction;

    const confidence =
      body?.confidence ??
      null;

    const message =
      body?.message ??
      null;

    /*
     * --------------------------------------------------
     * KULLANICI KONTROLÜ
     * --------------------------------------------------
     */

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kullanıcı bilgisi gerekli.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------
     * MAÇ KONTROLÜ
     * --------------------------------------------------
     */

    if (!matchId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Maç bilgisi gerekli.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------
     * TAHMİN KONTROLÜ
     * --------------------------------------------------
     */

    const allowedPredictions = [
      "MS1",
      "MSX",
      "MS2",

      "DC1X",
      "DC12",
      "DCX2",

      "U05",
      "O05",
      "U15",
      "O15",
      "U25",
      "O25",
      "U35",
      "O35",
      "U45",
      "O45",

      "HT1",
      "HTX",
      "HT2",

      "HTU05",
      "HTO05",
      "HTU15",
      "HTO15",
      "HTU25",
      "HTO25",

      "HTDC1X",
      "HTDC12",
      "HTDCX2",

      "2H1",
      "2HX",
      "2H2",

      "ODD",
      "EVEN",

      "GOAL_RANGE_0_1",
      "GOAL_RANGE_2_3",
      "GOAL_RANGE_4_5",
      "GOAL_RANGE_6_PLUS",

      "BTTS_YES",
      "BTTS_NO",

      "FIRST_GOAL_HOME",
      "FIRST_GOAL_NONE",
      "FIRST_GOAL_AWAY",

      "MOST_GOALS_1H",
      "MOST_GOALS_EQUAL",
      "MOST_GOALS_2H",
    ];

    if (
      !allowedPredictions.includes(
        prediction
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geçersiz tahmin seçimi.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------
     * GÜVEN KONTROLÜ
     * --------------------------------------------------
     */

    if (
      confidence !== null &&
      (
        !Number.isInteger(
          Number(confidence)
        ) ||
        Number(confidence) < 1 ||
        Number(confidence) > 100
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Güven oranı 1 ile 100 arasında olmalıdır.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------
     * MESAJ KONTROLÜ
     * --------------------------------------------------
     */

    let cleanMessage =
      null;

    if (
      message !== null &&
      message !== undefined
    ) {
      if (
        typeof message !==
        "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Analiz metni geçersiz.",
          },
          {
            status: 400,
          }
        );
      }

      cleanMessage =
        message.trim();

      if (
        cleanMessage.length >
        2000
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Analiz en fazla 2000 karakter olabilir.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !cleanMessage
      ) {
        cleanMessage =
          null;
      }
    }

    const supabase =
      getSupabase();

    /*
     * --------------------------------------------------
     * KULLANICIYI BUL
     * --------------------------------------------------
     */

    const {
      data: user,
      error: userError,
    } = await supabase
      .from("users")
      .select("id")
      .eq(
        "id",
        userId
      )
      .maybeSingle();

    if (userError) {
      console.error(
        "Prediction user lookup error:",
        userError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            userError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kullanıcı bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * --------------------------------------------------
     * MAÇI BUL / GEREKİRSE SUPABASE'E EKLE
     * --------------------------------------------------
     */

    let match;

    try {
      match =
        await findMatch(
          supabase,
          matchId
        );
    } catch (
      matchLookupError
    ) {
      console.error(
        "Prediction match lookup error:",
        matchLookupError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            matchLookupError?.message ||
            "Maç kontrol edilemedi.",
        },
        {
          status: 500,
        }
      );
    }

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Maç bulunamadı. Mackolik ID ile maç verisi alınamadı.",
          received_match_id:
            String(
              matchId
            ).trim(),
        },
        {
          status: 404,
        }
      );
    }

    /*
     * --------------------------------------------------
     * AYNI MAÇA DAHA ÖNCE TAHMİN YAPILMIŞ MI?
     * --------------------------------------------------
     */

    const {
      data:
        existingPrediction,
      error:
        existingError,
    } = await supabase
      .from("predictions")
      .select("id")
      .eq(
        "user_id",
        userId
      )
      .eq(
        "match_id",
        match.id
      )
      .maybeSingle();

    if (existingError) {
      console.error(
        "Existing prediction lookup error:",
        existingError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            existingError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      existingPrediction
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu maç için zaten bir tahmin yaptınız.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * --------------------------------------------------
     * TAHMİNİ KAYDET
     * --------------------------------------------------
     */

    const {
      data,
      error,
    } = await supabase
      .from("predictions")
      .insert({
        user_id:
          userId,

        match_id:
          match.id,

        prediction,

        confidence:
          confidence === null
            ? null
            : Number(
                confidence
              ),

        message:
          cleanMessage,
      })
      .select(
        `
          id,
          prediction,
          confidence,
          message,
          created_at,
          user_id,
          match_id,
          result,
          points,

          users (
            id,
            telegram_id,
            username,
            first_name,
            last_name,
            avatar_url
          ),

          matches (
            id,
            external_id,
            league,
            home_team,
            away_team,
            home_logo,
            away_logo,
            match_date,
            status
          )
        `
      )
      .single();

    if (error) {
      console.error(
        "Predictions POST error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        prediction:
          data,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Predictions POST server error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Tahmin gönderilirken bir hata oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}
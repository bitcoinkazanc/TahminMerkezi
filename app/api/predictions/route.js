"app/api/predictions/route.js"

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/*
 * Mackolik/API maç ID'si UUID değildir.
 *
 * Örnek:
 * c6f9csiwtzkjr2ei2wekrs8pg
 *
 * Supabase:
 * matches.id = UUID
 *
 * Bu fonksiyon dışarıdan gelen maç ID'sini
 * önce external_id üzerinden bulur ve
 * Supabase UUID'sini döndürür.
 */
async function resolveMatch(supabase, incomingMatchId) {
  if (!incomingMatchId) {
    return {
      match: null,
      error: "Maç bilgisi gerekli.",
    };
  }

  const value = String(incomingMatchId).trim();

  if (!value) {
    return {
      match: null,
      error: "Maç bilgisi gerekli.",
    };
  }

  /*
   * Önce external_id üzerinden ara.
   *
   * Mackolik ID'leri burada tutuluyor.
   */
  const { data: externalMatch, error: externalError } =
    await supabase
      .from("matches")
      .select("id, external_id, source_id, status")
      .eq("external_id", value)
      .maybeSingle();

  if (externalError) {
    console.error(
      "Match external_id lookup error:",
      externalError
    );

    return {
      match: null,
      error: externalError.message,
    };
  }

  if (externalMatch) {
    return {
      match: externalMatch,
      error: null,
    };
  }

  /*
   * Bazı eski kayıtlarımız source_id kullanıyor olabilir.
   */
  const { data: sourceMatch, error: sourceError } =
    await supabase
      .from("matches")
      .select("id, external_id, source_id, status")
      .eq("source_id", value)
      .maybeSingle();

  if (sourceError) {
    console.error(
      "Match source_id lookup error:",
      sourceError
    );

    return {
      match: null,
      error: sourceError.message,
    };
  }

  if (sourceMatch) {
    return {
      match: sourceMatch,
      error: null,
    };
  }

  /*
   * Son olarak gelen değer gerçekten UUID ise
   * matches.id üzerinden aramayı deneyebiliriz.
   *
   * Böylece eski sistemle oluşturulmuş linkler de
   * çalışmaya devam eder.
   */
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(value)) {
    const { data: uuidMatch, error: uuidError } =
      await supabase
        .from("matches")
        .select("id, external_id, source_id, status")
        .eq("id", value)
        .maybeSingle();

    if (uuidError) {
      console.error(
        "Match UUID lookup error:",
        uuidError
      );

      return {
        match: null,
        error: uuidError.message,
      };
    }

    if (uuidMatch) {
      return {
        match: uuidMatch,
        error: null,
      };
    }
  }

  return {
    match: null,
    error: "Maç bulunamadı.",
  };
}

export async function GET(request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    const incomingMatchId =
      searchParams.get("match_id");

    const userId =
      searchParams.get("user_id");

    let query = supabase
      .from("predictions")
      .select(`
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
          source_id,
          league,
          home_team,
          away_team,
          home_logo,
          away_logo,
          match_date,
          status
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    /*
     * Dışarıdan Mackolik ID geliyorsa
     * önce gerçek Supabase UUID'sini bul.
     */
    if (incomingMatchId) {
      const resolved =
        await resolveMatch(
          supabase,
          incomingMatchId
        );

      if (resolved.error) {
        return NextResponse.json(
          {
            success: false,
            error: resolved.error,
          },
          { status: 404 }
        );
      }

      query = query.eq(
        "match_id",
        resolved.match.id
      );
    }

    /*
     * Kullanıcı filtresi.
     */
    if (userId) {
      query = query.eq(
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
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      predictions: data || [],
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
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body =
      await request.json();

    const userId =
      body?.user_id;

    /*
     * Buradaki match_id Mackolik ID'si olabilir.
     *
     * Örnek:
     * c6f9csiwtzkjr2ei2wekrs8pg
     */
    const incomingMatchId =
      body?.match_id;

    const prediction =
      body?.prediction;

    const confidence =
      body?.confidence ?? null;

    const message =
      body?.message ?? null;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kullanıcı bilgisi gerekli.",
        },
        { status: 400 }
      );
    }

    if (!incomingMatchId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Maç bilgisi gerekli.",
        },
        { status: 400 }
      );
    }

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
        { status: 400 }
      );
    }

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
        { status: 400 }
      );
    }

    let cleanMessage = null;

    if (
      message !== null &&
      message !== undefined
    ) {
      if (
        typeof message !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Analiz metni geçersiz.",
          },
          { status: 400 }
        );
      }

      cleanMessage =
        message.trim();

      if (
        cleanMessage.length > 2000
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Analiz en fazla 2000 karakter olabilir.",
          },
          { status: 400 }
        );
      }

      if (!cleanMessage) {
        cleanMessage = null;
      }
    }

    const supabase =
      getSupabase();

    /*
     * KULLANICI KONTROLÜ
     */
    const {
      data: user,
      error: userError,
    } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
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
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kullanıcı bulunamadı.",
        },
        { status: 404 }
      );
    }

    /*
     * MAÇI ÇÖZÜMLE
     *
     * Burada artık:
     *
     * c6f9csiwtzkjr2ei2wekrs8pg
     *
     * gibi Mackolik ID'sini doğrudan
     * UUID alanına göndermiyoruz.
     */
    const resolved =
      await resolveMatch(
        supabase,
        incomingMatchId
      );

    if (resolved.error) {
      return NextResponse.json(
        {
          success: false,
          error:
            resolved.error,
        },
        { status: 404 }
      );
    }

    const match =
      resolved.match;

    /*
     * Bundan sonra kullanılacak ID:
     *
     * matches.id
     *
     * yani gerçek Supabase UUID'si.
     */
    const matchUuid =
      match.id;

    /*
     * MEVCUT TAHMİN KONTROLÜ
     */
    const {
      data: existingPrediction,
      error: existingError,
    } = await supabase
      .from("predictions")
      .select("id")
      .eq("user_id", userId)
      .eq("match_id", matchUuid)
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
        { status: 500 }
      );
    }

    if (existingPrediction) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu maç için zaten bir tahmin yaptınız.",
        },
        { status: 409 }
      );
    }

    /*
     * TAHMİNİ KAYDET
     *
     * predictions.match_id artık
     * Mackolik ID'si değil,
     * Supabase matches.id UUID'si.
     */
    const {
      data,
      error,
    } = await supabase
      .from("predictions")
      .insert({
        user_id: userId,

        match_id:
          matchUuid,

        prediction,

        confidence:
          confidence === null
            ? null
            : Number(confidence),

        message:
          cleanMessage,
      })
      .select(`
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
          source_id,
          league,
          home_team,
          away_team,
          home_logo,
          away_logo,
          match_date,
          status
        )
      `)
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
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,

        /*
         * Debug/istemci tarafında
         * hangi ID'nin kullanıldığını
         * görmek için ikisini de döndürüyoruz.
         */
        match_id:
          matchUuid,

        external_match_id:
          match.external_id ||
          match.source_id ||
          null,

        prediction: data,
      },
      { status: 201 }
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
          "Tahmin gönderilirken bir sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}
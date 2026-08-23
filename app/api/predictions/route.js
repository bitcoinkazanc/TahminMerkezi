import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

/*
 * Supabase UUID kontrolü.
 *
 * matches.id = UUID
 * matches.external_id = Mackolik ID
 */
function isUuid(value) {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value)
  );
}

/*
 * Gelen match_id'nin:
 *
 * - Supabase UUID olması durumunda matches.id
 * - Mackolik ID olması durumunda matches.external_id
 *
 * üzerinden gerçek Supabase maç kaydını bulur.
 */
async function findMatch(supabase, matchId) {
  const requestedId = String(matchId).trim();

  if (!requestedId) {
    return {
      match: null,
      error: "Maç bilgisi gerekli.",
    };
  }

  let query;

  if (isUuid(requestedId)) {
    query = supabase
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
      .eq("id", requestedId)
      .maybeSingle();
  } else {
    query = supabase
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
      .eq("external_id", requestedId)
      .maybeSingle();
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "Prediction match lookup error:",
      error
    );

    return {
      match: null,
      error: error.message,
    };
  }

  return {
    match: data || null,
    error: null,
  };
}

async function getUser(supabase, userId) {
  const requestedUserId = String(userId).trim();

  if (!requestedUserId) {
    return {
      user: null,
      error: "Kullanıcı bilgisi gerekli.",
    };
  }

  /*
   * users.id de UUID olduğu için burada
   * UUID olmayan değeri direkt id'ye göndermiyoruz.
   *
   * Telegram ID gönderiliyorsa telegram_id üzerinden
   * kullanıcıyı buluyoruz.
   */
  if (isUuid(requestedUserId)) {
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        telegram_id,
        username,
        first_name,
        last_name,
        avatar_url
      `)
      .eq("id", requestedUserId)
      .maybeSingle();

    return {
      user: data || null,
      error: error?.message || null,
    };
  }

  const { data, error } = await supabase
    .from("users")
    .select(`
      id,
      telegram_id,
      username,
      first_name,
      last_name,
      avatar_url
    `)
    .eq("telegram_id", requestedUserId)
    .maybeSingle();

  return {
    user: data || null,
    error: error?.message || null,
  };
}

const ALLOWED_PREDICTIONS = [
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

function predictionSelect() {
  return `
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
      status,
      home_score,
      away_score
    )
  `;
}

export async function GET(request) {
  try {
    const supabase = getSupabase();

    const { searchParams } =
      new URL(request.url);

    const matchId =
      searchParams.get("match_id");

    const userId =
      searchParams.get("user_id");

    let query = supabase
      .from("predictions")
      .select(predictionSelect())
      .order("created_at", {
        ascending: false,
      });

    /*
     * match_id gönderilmişse:
     *
     * Önce maçın gerçek Supabase UUID'sini buluyoruz.
     *
     * Böylece frontend yanlışlıkla Mackolik ID
     * gönderse bile sorgu bozulmuyor.
     */
    if (matchId) {
      const {
        match,
        error: matchLookupError,
      } = await findMatch(
        supabase,
        matchId
      );

      if (matchLookupError) {
        return NextResponse.json(
          {
            success: false,
            error: matchLookupError,
          },
          { status: 500 }
        );
      }

      if (!match) {
        return NextResponse.json({
          success: true,
          predictions: [],
        });
      }

      query = query.eq(
        "match_id",
        match.id
      );
    }

    /*
     * user_id için de UUID / Telegram ID
     * ayrımını yapıyoruz.
     */
    if (userId) {
      const {
        user,
        error: userLookupError,
      } = await getUser(
        supabase,
        userId
      );

      if (userLookupError) {
        console.error(
          "Prediction GET user lookup error:",
          userLookupError
        );

        return NextResponse.json(
          {
            success: false,
            error: userLookupError,
          },
          { status: 500 }
        );
      }

      if (!user) {
        return NextResponse.json({
          success: true,
          predictions: [],
        });
      }

      query = query.eq(
        "user_id",
        user.id
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

    const matchId =
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

    if (!matchId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Maç bilgisi gerekli.",
        },
        { status: 400 }
      );
    }

    if (
      !ALLOWED_PREDICTIONS.includes(
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
        cleanMessage.length >
        2000
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
     * --------------------------------------------------
     * 1. KULLANICIYI BUL
     * --------------------------------------------------
     */
    const {
      user,
      error: userError,
    } = await getUser(
      supabase,
      userId
    );

    if (userError) {
      console.error(
        "Prediction user lookup error:",
        userError
      );

      return NextResponse.json(
        {
          success: false,
          error: userError,
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
     * --------------------------------------------------
     * 2. MAÇI BUL
     * --------------------------------------------------
     *
     * Buradaki en önemli düzeltme:
     *
     * Mackolik:
     * c6f9csiwtzkjr2ei2wekrs8pg
     *
     * matches.external_id
     *
     * Supabase:
     * 550e8400-e29b-41d4-a716-446655440000
     *
     * matches.id
     *
     * predictions.match_id'ye SADECE
     * Supabase UUID yazılacak.
     */
    const {
      match,
      error: matchError,
    } = await findMatch(
      supabase,
      matchId
    );

    if (matchError) {
      console.error(
        "Prediction match lookup error:",
        matchError
      );

      return NextResponse.json(
        {
          success: false,
          error: matchError,
        },
        { status: 500 }
      );
    }

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Maç bulunamadı. Mackolik ID ile Supabase matches.external_id eşleşmesi yok.",
        },
        { status: 404 }
      );
    }

    /*
     * --------------------------------------------------
     * 3. DAHA ÖNCE TAHMİN YAPILMIŞ MI?
     * --------------------------------------------------
     */
    const {
      data: existingPrediction,
      error: existingError,
    } = await supabase
      .from("predictions")
      .select("id")
      .eq(
        "user_id",
        user.id
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
     * --------------------------------------------------
     * 4. TAHMİNİ KAYDET
     * --------------------------------------------------
     *
     * DİKKAT:
     *
     * match_id: match.id
     *
     * Burada artık Mackolik ID kesinlikle
     * predictions.match_id alanına gitmiyor.
     */
    const {
      data,
      error,
    } = await supabase
      .from("predictions")
      .insert({
        user_id: user.id,

        match_id: match.id,

        prediction,

        confidence:
          confidence === null
            ? null
            : Number(confidence),

        message:
          cleanMessage,
      })
      .select(
        predictionSelect()
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
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
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
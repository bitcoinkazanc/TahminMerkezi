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

export async function GET(request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    const matchId = searchParams.get("match_id");
    const userId = searchParams.get("user_id");

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
          league,
          home_team,
          away_team,
          home_logo,
          away_logo,
          match_date,
          status
        )
      `)
      .order("created_at", { ascending: false });

    if (matchId) {
      query = query.eq("match_id", matchId);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Predictions GET error:", error);

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
    console.error("Predictions GET server error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Tahminler alınırken bir sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const userId = body?.user_id;
    const matchId = body?.match_id;
    const prediction = body?.prediction;
    const confidence = body?.confidence ?? null;
    const message = body?.message ?? null;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Kullanıcı bilgisi gerekli.",
        },
        { status: 400 }
      );
    }

    if (!matchId) {
      return NextResponse.json(
        {
          success: false,
          error: "Maç bilgisi gerekli.",
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

    if (!allowedPredictions.includes(prediction)) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz tahmin seçimi.",
        },
        { status: 400 }
      );
    }

    if (
      confidence !== null &&
      (!Number.isInteger(Number(confidence)) ||
        Number(confidence) < 1 ||
        Number(confidence) > 100)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Güven oranı 1 ile 100 arasında olmalıdır.",
        },
        { status: 400 }
      );
    }

    let cleanMessage = null;

    if (message !== null && message !== undefined) {
      if (typeof message !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: "Analiz metni geçersiz.",
          },
          { status: 400 }
        );
      }

      cleanMessage = message.trim();

      if (cleanMessage.length > 2000) {
        return NextResponse.json(
          {
            success: false,
            error: "Analiz en fazla 2000 karakter olabilir.",
          },
          { status: 400 }
        );
      }

      if (!cleanMessage) {
        cleanMessage = null;
      }
    }

    const supabase = getSupabase();

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error("Prediction user lookup error:", userError);

      return NextResponse.json(
        {
          success: false,
          error: userError.message,
        },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Kullanıcı bulunamadı.",
        },
        { status: 404 }
      );
    }

    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, status")
      .eq("id", matchId)
      .maybeSingle();

    if (matchError) {
      console.error("Prediction match lookup error:", matchError);

      return NextResponse.json(
        {
          success: false,
          error: matchError.message,
        },
        { status: 500 }
      );
    }

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          error: "Maç bulunamadı.",
        },
        { status: 404 }
      );
    }

    const { data: existingPrediction, error: existingError } =
      await supabase
        .from("predictions")
        .select("id")
        .eq("user_id", userId)
        .eq("match_id", matchId)
        .maybeSingle();

    if (existingError) {
      console.error(
        "Existing prediction lookup error:",
        existingError
      );

      return NextResponse.json(
        {
          success: false,
          error: existingError.message,
        },
        { status: 500 }
      );
    }

    if (existingPrediction) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu maç için zaten bir tahmin yaptınız.",
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("predictions")
      .insert({
        user_id: userId,
        match_id: matchId,
        prediction,
        confidence:
          confidence === null ? null : Number(confidence),
        message: cleanMessage,
      })
      .select(`
        id,
        prediction,
        confidence,
        message,
        created_at,
        user_id,
        match_id,
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
      console.error("Predictions POST error:", error);

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
    console.error("Predictions POST server error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Tahmin gönderilirken bir sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}
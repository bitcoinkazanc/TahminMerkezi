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

export async function GET(request) {
  try {
    const supabase = getSupabase();

    const { searchParams } = new URL(
      request.url
    );

    const predictionId =
      searchParams.get("prediction_id");

    const userId =
      searchParams.get("user_id");

    if (!predictionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Tahmin bilgisi gerekli.",
        },
        { status: 400 }
      );
    }

    const {
      count,
      error: countError,
    } = await supabase
      .from("likes")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "prediction_id",
        predictionId
      );

    if (countError) {
      return NextResponse.json(
        {
          success: false,
          error: countError.message,
        },
        { status: 500 }
      );
    }

    let liked = false;

    if (userId) {
      const {
        data,
        error,
      } = await supabase
        .from("likes")
        .select("id")
        .eq("prediction_id", predictionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          { status: 500 }
        );
      }

      liked = !!data;
    }

    return NextResponse.json({
      success: true,
      count: count || 0,
      liked,
    });
  } catch (error) {
    console.error(
      "Likes GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Beğeni bilgisi alınamadı.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const supabase = getSupabase();

    const body = await request.json();

    const userId = body?.user_id;
    const predictionId =
      body?.prediction_id;

    if (!userId || !predictionId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kullanıcı ve tahmin bilgisi gerekli.",
        },
        { status: 400 }
      );
    }

    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", userId)
      .eq(
        "prediction_id",
        predictionId
      )
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          success: false,
          error: existingError.message,
        },
        { status: 500 }
      );
    }

    if (existing) {
      await supabase
        .from("likes")
        .delete()
        .eq("id", existing.id);

      return NextResponse.json({
        success: true,
        liked: false,
      });
    }

    const {
      error: insertError,
    } = await supabase
      .from("likes")
      .insert({
        user_id: userId,
        prediction_id: predictionId,
      });

    if (insertError) {
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      liked: true,
    });
  } catch (error) {
    console.error(
      "Likes POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Beğeni işlemi başarısız.",
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(request) {
  try {
    const supabase = getSupabase();

    const { searchParams } =
      new URL(request.url);

    const predictionId =
      searchParams.get(
        "prediction_id"
      );

    if (!predictionId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tahmin bilgisi gerekli.",
        },
        { status: 400 }
      );
    }

    const {
      data,
      error,
    } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        created_at,
        user_id,
        prediction_id,
        users (
          id,
          username,
          first_name,
          avatar_url
        )
      `)
      .eq(
        "prediction_id",
        predictionId
      )
      .order("created_at", {
        ascending: true,
      })
      .limit(100);

    if (error) {
      console.error(
        "Comments GET query error:",
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
      count:
        Array.isArray(data)
          ? data.length
          : 0,
      comments: data || [],
    });
  } catch (error) {
    console.error(
      "Comments GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Yorumlar alınamadı.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const supabase = getSupabase();

    const body =
      await request.json();

    const userId =
      body?.user_id;

    const predictionId =
      body?.prediction_id;

    const content =
      typeof body?.content === "string"
        ? body.content.trim()
        : "";

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

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Yorum boş olamaz.",
        },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Yorum en fazla 500 karakter olabilir.",
        },
        { status: 400 }
      );
    }

    const {
      data: user,
      error: userError,
    } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
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

    const {
      data: prediction,
      error: predictionError,
    } = await supabase
      .from("predictions")
      .select("id")
      .eq(
        "id",
        predictionId
      )
      .maybeSingle();

    if (predictionError) {
      return NextResponse.json(
        {
          success: false,
          error:
            predictionError.message,
        },
        { status: 500 }
      );
    }

    if (!prediction) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tahmin bulunamadı.",
        },
        { status: 404 }
      );
    }

    const {
      data,
      error,
    } = await supabase
      .from("messages")
      .insert({
        user_id: userId,
        prediction_id:
          predictionId,
        content,
      })
      .select(`
        id,
        content,
        created_at,
        user_id,
        prediction_id,
        users (
          id,
          username,
          first_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error(
        "Comments POST insert error:",
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
        comment: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Comments POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Yorum gönderilemedi.",
      },
      { status: 500 }
    );
  }
}
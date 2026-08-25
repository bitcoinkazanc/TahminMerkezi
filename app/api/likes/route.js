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

    const userId =
      searchParams.get("user_id");

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
      console.error(
        "Likes count error:",
        countError
      );

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
        .eq(
          "prediction_id",
          predictionId
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error(
          "Likes user check error:",
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

      liked = !!data;
    }

    return NextResponse.json({
      success: true,
      count: Number(count) || 0,
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

    const body =
      await request.json();

    const userId =
      body?.user_id;

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
      data: user,
      error: userError,
    } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error(
        "Like user check error:",
        userError
      );

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
      console.error(
        "Like prediction check error:",
        predictionError
      );

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
      data: existing,
      error: existingError,
    } = await supabase
      .from("likes")
      .select("id")
      .eq(
        "user_id",
        userId
      )
      .eq(
        "prediction_id",
        predictionId
      )
      .maybeSingle();

    if (existingError) {
      console.error(
        "Existing like check error:",
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

    if (existing) {
      const {
        error: deleteError,
      } = await supabase
        .from("likes")
        .delete()
        .eq(
          "id",
          existing.id
        );

      if (deleteError) {
        console.error(
          "Like delete error:",
          deleteError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              deleteError.message,
          },
          { status: 500 }
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
            success: true,
            liked: false,
          }
        );
      }

      return NextResponse.json({
        success: true,
        liked: false,
        count:
          Number(count) || 0,
      });
    }

    const {
      error: insertError,
    } = await supabase
      .from("likes")
      .insert({
        user_id: userId,
        prediction_id:
          predictionId,
      });

    if (insertError) {
      console.error(
        "Like insert error:",
        insertError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            insertError.message,
        },
        { status: 500 }
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
      return NextResponse.json({
        success: true,
        liked: true,
      });
    }

    return NextResponse.json({
      success: true,
      liked: true,
      count:
        Number(count) || 0,
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
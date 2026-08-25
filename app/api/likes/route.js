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

    const { searchParams } = new URL(request.url);

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

    const { data, error } = await supabase
      .from("likes")
      .select("vote_type")
      .eq("prediction_id", predictionId);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    const votes = data || [];

    const upCount = votes.filter(
      (vote) => vote.vote_type === "up"
    ).length;

    const downCount = votes.filter(
      (vote) => vote.vote_type === "down"
    ).length;

    let userVote = null;

    if (userId) {
      const { data: userVoteData, error: userVoteError } =
        await supabase
          .from("likes")
          .select("vote_type")
          .eq("prediction_id", predictionId)
          .eq("user_id", userId)
          .maybeSingle();

      if (userVoteError) {
        return NextResponse.json(
          {
            success: false,
            error: userVoteError.message,
          },
          { status: 500 }
        );
      }

      userVote = userVoteData?.vote_type || null;
    }

    return NextResponse.json({
      success: true,
      upCount,
      downCount,
      userVote,
    });
  } catch (error) {
    console.error("Votes GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Oy bilgisi alınamadı.",
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
    const predictionId = body?.prediction_id;
    const voteType = body?.vote_type;

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

    if (!["up", "down"].includes(voteType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz oy türü.",
        },
        { status: 400 }
      );
    }

    const { data: existing, error: existingError } =
      await supabase
        .from("likes")
        .select("id, vote_type")
        .eq("user_id", userId)
        .eq("prediction_id", predictionId)
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
      if (existing.vote_type === voteType) {
        const { error: deleteError } =
          await supabase
            .from("likes")
            .delete()
            .eq("id", existing.id);

        if (deleteError) {
          return NextResponse.json(
            {
              success: false,
              error: deleteError.message,
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          userVote: null,
        });
      }

      const { error: updateError } =
        await supabase
          .from("likes")
          .update({
            vote_type: voteType,
          })
          .eq("id", existing.id);

      if (updateError) {
        return NextResponse.json(
          {
            success: false,
            error: updateError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        userVote: voteType,
      });
    }

    const { error: insertError } =
      await supabase
        .from("likes")
        .insert({
          user_id: userId,
          prediction_id: predictionId,
          vote_type: voteType,
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
      userVote: voteType,
    });
  } catch (error) {
    console.error("Votes POST error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Oy işlemi başarısız.",
      },
      { status: 500 }
    );
  }
}
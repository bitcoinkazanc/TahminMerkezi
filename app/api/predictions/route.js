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

async function findMatch(supabase, matchId) {
  if (!matchId) {
    return null;
  }

  const requestedId = String(matchId).trim();

  if (!requestedId) {
    return null;
  }

  const {
    data: externalMatch,
    error: externalError,
  } = await supabase
    .from("matches")
    .select("id, external_id, status")
    .eq("external_id", requestedId)
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

  const {
    data: uuidMatch,
    error: uuidError,
  } = await supabase
    .from("matches")
    .select("id, external_id, status")
    .eq("id", requestedId)
    .maybeSingle();

  if (uuidError) {
    if (
      uuidError.code === "22P02" ||
      uuidError.message?.includes(
        "invalid input syntax for type uuid"
      )
    ) {
      return null;
    }

    console.error(
      "Match UUID lookup error:",
      uuidError
    );

    throw uuidError;
  }

  return uuidMatch || null;
}

async function findUser(supabase, userId) {
  if (!userId) {
    return null;
  }

  const requestedId = String(userId).trim();

  if (!requestedId) {
    return null;
  }

  /*
   * 1. Önce Supabase users.id UUID olarak kontrol et.
   */
  const {
    data: userById,
    error: userByIdError,
  } = await supabase
    .from("users")
    .select("id, telegram_id")
    .eq("id", requestedId)
    .maybeSingle();

  if (userByIdError) {
    if (
      userByIdError.code !== "22P02" &&
      !userByIdError.message?.includes(
        "invalid input syntax for type uuid"
      )
    ) {
      console.error(
        "User UUID lookup error:",
        userByIdError
      );

      throw userByIdError;
    }
  }

  if (userById) {
    return userById;
  }

  /*
   * 2. Eğer gelen değer Telegram ID ise
   * users.telegram_id üzerinden bul.
   */
  const {
    data: userByTelegramId,
    error: telegramError,
  } = await supabase
    .from("users")
    .select("id, telegram_id")
    .eq(
      "telegram_id",
      requestedId
    )
    .maybeSingle();

  if (telegramError) {
    console.error(
      "User Telegram ID lookup error:",
      telegramError
    );

    throw telegramError;
  }

  return userByTelegramId || null;
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
      `)
      .order("created_at", {
        ascending: false,
      });

    if (matchId) {
      const match = await findMatch(
        supabase,
        matchId
      );

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

    if (userId) {
      const user = await findUser(
        supabase,
        userId
      );

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
        {
          status: 500,
        }
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
      {
        status: 500,
      }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const userId = body?.user_id;
    const matchId = body?.match_id;
    const prediction = body?.prediction;
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
        {
          status: 400,
        }
      );
    }

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
          {
            status: 400,
          }
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
          {
            status: 400,
          }
        );
      }

      if (!cleanMessage) {
        cleanMessage = null;
      }
    }

    const supabase =
      getSupabase();

    const user = await findUser(
      supabase,
      userId
    );

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

    const match = await findMatch(
      supabase,
      matchId
    );

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Maç bulunamadı. Maçkolik ID ile Supabase matches.external_id eşleşmesi yok.",
          received_match_id:
            String(matchId),
        },
        {
          status: 404,
        }
      );
    }

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
        {
          status: 500,
        }
      );
    }

    if (existingPrediction) {
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
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        prediction: data,
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
          "Tahmin gönderilirken bir sunucu hatası oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(
      request.url
    );

    const predictionId =
      searchParams.get("id");

    const userId =
      searchParams.get("user_id");

    if (!predictionId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tahmin ID gerekli.",
        },
        {
          status: 400,
        }
      );
    }

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
     * Gelen user_id ister Supabase UUID
     * ister Telegram ID olsun gerçek kullanıcıyı bul.
     */
    const user = await findUser(
      supabase,
      userId
    );

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

    const {
      data: prediction,
      error: predictionError,
    } = await supabase
      .from("predictions")
      .select(
        "id, user_id"
      )
      .eq(
        "id",
        predictionId
      )
      .maybeSingle();

    if (predictionError) {
      console.error(
        "Prediction delete lookup error:",
        predictionError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            predictionError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!prediction) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tahmin bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Tahminin sahibi ile isteği yapan
     * gerçek Supabase kullanıcı UUID'sini karşılaştır.
     */
    if (
      String(prediction.user_id) !==
      String(user.id)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu tahmini silme yetkiniz yok.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data: deletedPrediction,
      error: deleteError,
    } = await supabase
      .from("predictions")
      .delete()
      .eq(
        "id",
        predictionId
      )
      .eq(
        "user_id",
        user.id
      )
      .select("id")
      .maybeSingle();

    if (deleteError) {
      console.error(
        "Prediction delete error:",
        deleteError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            deleteError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!deletedPrediction) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tahmin silinemedi.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Tahmin başarıyla silindi.",
    });
  } catch (error) {
    console.error(
      "Prediction DELETE server error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Tahmin silinirken bir sunucu hatası oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}
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

/*
 * ==================================================
 * GET
 * ==================================================
 *
 * DESTEKLENEN:
 *
 * ?prediction_id=...
 * → Tek tahminin yorumları
 *
 * ?match_id=...
 * → Maçtaki tüm tahminlerin toplam yorum sayısı
 *
 * Mevcut prediction_id sistemi korunur.
 */

export async function GET(request) {
  try {
    const supabase =
      getSupabase();

    const { searchParams } =
      new URL(request.url);

    const predictionId =
      searchParams.get(
        "prediction_id"
      );

    const matchId =
      searchParams.get(
        "match_id"
      );

    /*
     * ==================================================
     * 1. TEK TAHMİNİN YORUMLARI
     * ==================================================
     */

    if (predictionId) {
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
        .order(
          "created_at",
          {
            ascending: true,
          }
        )
        .limit(100);

      if (error) {
        console.error(
          "Comments GET prediction database error:",
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
        comments:
          data || [],
        count:
          data?.length || 0,
      });
    }

    /*
     * ==================================================
     * 2. MAÇIN TOPLAM YORUM SAYISI
     * ==================================================
     *
     * Önce maçın tahminlerini buluyoruz.
     *
     * Sonra bu tahminlere ait
     * messages kayıtlarının sayısını
     * tek sorguda alıyoruz.
     */

    if (matchId) {
      /*
       * --------------------------------------------------
       * MAÇ ID'SİNİ BUL
       * --------------------------------------------------
       */

      const {
        data: match,
        error: matchError,
      } = await supabase
        .from("matches")
        .select(
          "id"
        )
        .or(
          `id.eq.${matchId},external_id.eq.${matchId}`
        )
        .maybeSingle();

      if (matchError) {
        console.error(
          "Comments match lookup error:",
          matchError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              matchError.message,
          },
          {
            status: 500,
          }
        );
      }

      if (!match) {
        return NextResponse.json({
          success: true,
          count: 0,
        });
      }

      /*
       * --------------------------------------------------
       * MAÇIN TAHMİNLERİNİ BUL
       * --------------------------------------------------
       */

      const {
        data: predictions,
        error:
          predictionsError,
      } = await supabase
        .from("predictions")
        .select(
          "id"
        )
        .eq(
          "match_id",
          match.id
        );

      if (predictionsError) {
        console.error(
          "Comments predictions lookup error:",
          predictionsError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              predictionsError.message,
          },
          {
            status: 500,
          }
        );
      }

      const predictionIds =
        (
          predictions || []
        )
          .map(
            (prediction) =>
              prediction?.id
          )
          .filter(Boolean);

      /*
       * Maçta hiç tahmin yoksa
       * yorum da yoktur.
       */

      if (
        predictionIds.length ===
        0
      ) {
        return NextResponse.json({
          success: true,
          count: 0,
        });
      }

      /*
       * --------------------------------------------------
       * TÜM YORUMLARI TEK SORGUDA SAY
       * --------------------------------------------------
       */

      const {
        count,
        error:
          commentsError,
      } = await supabase
        .from("messages")
        .select(
          "id",
          {
            count:
              "exact",
            head: true,
          }
        )
        .in(
          "prediction_id",
          predictionIds
        );

      if (commentsError) {
        console.error(
          "Comments count database error:",
          commentsError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              commentsError.message,
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        success: true,
        count:
          Number(count) || 0,
      });
    }

    /*
     * ==================================================
     * PARAMETRE YOK
     * ==================================================
     */

    return NextResponse.json(
      {
        success: false,
        error:
          "Tahmin veya maç bilgisi gerekli.",
      },
      {
        status: 400,
      }
    );
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
 *
 * Mevcut yorum gönderme sistemi
 * korunmuştur.
 */

export async function POST(request) {
  try {
    const supabase =
      getSupabase();

    const body =
      await request.json();

    const userId =
      body?.user_id;

    const predictionId =
      body?.prediction_id;

    const content =
      typeof body?.content ===
      "string"
        ? body.content.trim()
        : "";

    /*
     * --------------------------------------------------
     * KULLANICI + TAHMİN KONTROLÜ
     * --------------------------------------------------
     */

    if (
      !userId ||
      !predictionId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kullanıcı ve tahmin bilgisi gerekli.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------
     * YORUM KONTROLÜ
     * --------------------------------------------------
     */

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Yorum boş olamaz.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      content.length >
      500
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Yorum en fazla 500 karakter olabilir.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------
     * TAHMİNİ KONTROL ET
     * --------------------------------------------------
     */

    const {
      data: prediction,
      error:
        predictionError,
    } = await supabase
      .from("predictions")
      .select(
        "id"
      )
      .eq(
        "id",
        predictionId
      )
      .maybeSingle();

    if (predictionError) {
      console.error(
        "Prediction check error:",
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
     * --------------------------------------------------
     * KULLANICIYI KONTROL ET
     * --------------------------------------------------
     */

    const {
      data: user,
      error: userError,
    } = await supabase
      .from("users")
      .select(
        "id"
      )
      .eq(
        "id",
        userId
      )
      .maybeSingle();

    if (userError) {
      console.error(
        "User check error:",
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
     * YORUMU KAYDET
     * --------------------------------------------------
     */

    const {
      data,
      error,
    } = await supabase
      .from("messages")
      .insert({
        user_id:
          userId,

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
        "Comments POST database error:",
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
        comment:
          data,
      },
      {
        status: 201,
      }
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
      {
        status: 500,
      }
    );
  }
}
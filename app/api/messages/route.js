"app/api/messages/route.js"

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

  return createClient(
    url,
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/*
 * ==================================================
 * MAÇ BULMA
 * ==================================================
 *
 * Frontend tarafından gelen match_id:
 *
 * Mackolik ID olabilir.
 *
 * Örnek:
 *
 * 7qe3l3sw6pty2m4stmsknr190
 *
 * Bu değer matches.id UUID değildir.
 *
 * Bu nedenle:
 *
 * Mackolik ID
 *      ↓
 * matches.external_id
 *      ↓
 * gerçek Supabase matches.id
 *
 * elde edilir.
 *
 * matches.iddaa_code KULLANILMAZ.
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
        external_id
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
   *
   * Bazı ekranlar gerçek UUID gönderebilir.
   *
   * Sadece UUID formatındaysa matches.id
   * üzerinden arama yapılır.
   */

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    uuidRegex.test(requestedId)
  ) {
    const {
      data: uuidMatch,
      error: uuidError,
    } = await supabase
      .from("matches")
      .select(
        `
          id,
          external_id
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

  return null;
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

    const limitParam =
      Number(
        searchParams.get(
          "limit"
        ) || 50
      );

    const limit =
      Math.min(
        Math.max(
          limitParam,
          1
        ),
        100
      );

    let query =
      supabase
        .from("messages")
        .select(
          `
            id,
            content,
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
            )
          `
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        )
        .limit(
          limit
        );

    /*
     * --------------------------------------------------
     * MAÇ SOHBETİ FİLTRESİ
     * --------------------------------------------------
     *
     * Frontend Mackolik ID gönderse bile
     * messages.match_id UUID ile aranır.
     */

    if (matchId) {
      const match =
        await findMatch(
          supabase,
          matchId
        );

      if (!match) {
        return NextResponse.json({
          success: true,
          messages: [],
        });
      }

      query =
        query.eq(
          "match_id",
          match.id
        );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(
        "Messages GET error:",
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
      messages:
        data || [],
    });
  } catch (error) {
    console.error(
      "Messages GET server error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Mesajlar alınırken bir sunucu hatası oluştu.",
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

    const content =
      body?.content;

    const matchId =
      body?.match_id ||
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
     * MESAJ KONTROLÜ
     * --------------------------------------------------
     */

    if (
      !content ||
      typeof content !==
        "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Mesaj boş olamaz.",
        },
        {
          status: 400,
        }
      );
    }

    const cleanContent =
      content.trim();

    if (!cleanContent) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Mesaj boş olamaz.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      cleanContent.length >
      1000
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Mesaj en fazla 1000 karakter olabilir.",
        },
        {
          status: 400,
        }
      );
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
        "User lookup error:",
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
     * MAÇI BUL
     * --------------------------------------------------
     *
     * Gelen değer Mackolik ID ise:
     *
     * matchId
     *    ↓
     * matches.external_id
     *    ↓
     * matches.id
     *
     * Sonrasında messages.match_id içine
     * gerçek UUID yazılır.
     */

    let realMatchId =
      null;

    if (matchId) {
      const match =
        await findMatch(
          supabase,
          matchId
        );

      if (!match) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Maç bulunamadı. Mackolik ID ile Supabase matches.external_id eşleşmesi yok.",
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

      realMatchId =
        match.id;
    }

    /*
     * --------------------------------------------------
     * MESAJI KAYDET
     * --------------------------------------------------
     *
     * Burada artık Mackolik ID değil,
     * gerçek Supabase matches.id kullanılır.
     */

    const {
      data,
      error,
    } = await supabase
      .from("messages")
      .insert({
        user_id:
          userId,

        match_id:
          realMatchId,

        content:
          cleanContent,
      })
      .select(
        `
          id,
          content,
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
          )
        `
      )
      .single();

    if (error) {
      console.error(
        "Messages POST error:",
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
        message:
          data,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Messages POST server error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Mesaj gönderilirken bir sunucu hatası oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}
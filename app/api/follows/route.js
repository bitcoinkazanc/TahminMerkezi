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
 * UUID KONTROLÜ
 * ==================================================
 */

function isValidUuid(value) {
  if (
    typeof value !==
    "string"
  ) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

/*
 * ==================================================
 * KULLANICI KONTROLÜ
 * ==================================================
 */

async function userExists(
  supabase,
  userId
) {
  const {
    data,
    error,
  } = await supabase
    .from("users")
    .select("id")
    .eq(
      "id",
      userId
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!data;
}

/*
 * ==================================================
 * GET
 * ==================================================
 *
 * Kullanıcıların takip durumunu getirir.
 *
 * Kullanım:
 *
 * /api/follows?follower_id=UUID&following_id=UUID
 *
 * Dönen bilgiler:
 *
 * is_following
 * followers_count
 * following_count
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

    const followerId =
      searchParams.get(
        "follower_id"
      );

    const followingId =
      searchParams.get(
        "following_id"
      );

    /*
     * --------------------------------------------------
     * PARAMETRE KONTROLÜ
     * --------------------------------------------------
     */

    if (
      !followerId ||
      !followingId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "follower_id ve following_id gerekli.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isValidUuid(
        followerId
      ) ||
      !isValidUuid(
        followingId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geçersiz kullanıcı ID.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------
     * KULLANICILARI KONTROL ET
     * --------------------------------------------------
     */

    const followerExists =
      await userExists(
        supabase,
        followerId
      );

    const followingExists =
      await userExists(
        supabase,
        followingId
      );

    if (
      !followerExists ||
      !followingExists
    ) {
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
     * TAKİP DURUMU
     * --------------------------------------------------
     */

    const {
      data: follow,
      error: followError,
    } = await supabase
      .from("follows")
      .select("id")
      .eq(
        "follower_id",
        followerId
      )
      .eq(
        "following_id",
        followingId
      )
      .maybeSingle();

    if (followError) {
      console.error(
        "Follow status error:",
        followError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            followError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * --------------------------------------------------
     * TAKİPÇİ SAYISI
     * --------------------------------------------------
     */

    const {
      count:
        followersCount,
      error:
        followersError,
    } = await supabase
      .from("follows")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "following_id",
        followingId
      );

    if (followersError) {
      console.error(
        "Followers count error:",
        followersError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            followersError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * --------------------------------------------------
     * TAKİP EDİLEN SAYISI
     * --------------------------------------------------
     */

    const {
      count:
        followingCount,
      error:
        followingError,
    } = await supabase
      .from("follows")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      )
      .eq(
        "follower_id",
        followingId
      );

    if (followingError) {
      console.error(
        "Following count error:",
        followingError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            followingError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      is_following:
        !!follow,
      follow_id:
        follow?.id ||
        null,
      followers_count:
        followersCount ||
        0,
      following_count:
        followingCount ||
        0,
    });
  } catch (error) {
    console.error(
      "Follows GET server error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Takip bilgileri alınırken bir sunucu hatası oluştu.",
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
 * Kullanıcı takip eder.
 *
 * Body:
 *
 * {
 *   "follower_id": "UUID",
 *   "following_id": "UUID"
 * }
 */

export async function POST(
  request
) {
  try {
    const body =
      await request.json();

    const followerId =
      body?.follower_id;

    const followingId =
      body?.following_id;

    /*
     * --------------------------------------------------
     * PARAMETRE KONTROLÜ
     * --------------------------------------------------
     */

    if (
      !followerId ||
      !followingId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "follower_id ve following_id gerekli.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isValidUuid(
        followerId
      ) ||
      !isValidUuid(
        followingId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geçersiz kullanıcı ID.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------
     * KENDİNİ TAKİP ETME
     * --------------------------------------------------
     */

    if (
      followerId ===
      followingId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kendinizi takip edemezsiniz.",
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
     * KULLANICI KONTROLÜ
     * --------------------------------------------------
     */

    const followerExists =
      await userExists(
        supabase,
        followerId
      );

    if (
      !followerExists
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Takip eden kullanıcı bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    const followingExists =
      await userExists(
        supabase,
        followingId
      );

    if (
      !followingExists
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Takip edilecek kullanıcı bulunamadı.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * --------------------------------------------------
     * ZATEN TAKİP EDİLİYOR MU?
     * --------------------------------------------------
     */

    const {
      data: existingFollow,
      error:
        existingFollowError,
    } = await supabase
      .from("follows")
      .select("id")
      .eq(
        "follower_id",
        followerId
      )
      .eq(
        "following_id",
        followingId
      )
      .maybeSingle();

    if (
      existingFollowError
    ) {
      console.error(
        "Existing follow lookup error:",
        existingFollowError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            existingFollowError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      existingFollow
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu kullanıcıyı zaten takip ediyorsunuz.",
          follow_id:
            existingFollow.id,
        },
        {
          status: 409,
        }
      );
    }

    /*
     * --------------------------------------------------
     * TAKİP KAYDI OLUŞTUR
     * --------------------------------------------------
     */

    const {
      data,
      error,
    } = await supabase
      .from("follows")
      .insert({
        follower_id:
          followerId,

        following_id:
          followingId,
      })
      .select(
        `
          id,
          follower_id,
          following_id,
          created_at
        `
      )
      .single();

    if (error) {
      /*
       * UNIQUE constraint nedeniyle
       * aynı anda ikinci istek geldiyse
       * bunu da düzgün şekilde yakala.
       */

      if (
        error.code ===
        "23505"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Bu kullanıcıyı zaten takip ediyorsunuz.",
          },
          {
            status: 409,
          }
        );
      }

      console.error(
        "Follow INSERT error:",
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
        following: true,
        follow: data,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Follows POST server error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Takip işlemi sırasında bir sunucu hatası oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ==================================================
 * DELETE
 * ==================================================
 *
 * Takibi bırakır.
 *
 * Kullanım:
 *
 * /api/follows?follower_id=UUID&following_id=UUID
 */

export async function DELETE(
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

    const followerId =
      searchParams.get(
        "follower_id"
      );

    const followingId =
      searchParams.get(
        "following_id"
      );

    /*
     * --------------------------------------------------
     * PARAMETRE KONTROLÜ
     * --------------------------------------------------
     */

    if (
      !followerId ||
      !followingId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "follower_id ve following_id gerekli.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isValidUuid(
        followerId
      ) ||
      !isValidUuid(
        followingId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geçersiz kullanıcı ID.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------
     * TAKİP KAYDINI SİL
     * --------------------------------------------------
     */

    const {
      data,
      error,
    } = await supabase
      .from("follows")
      .delete()
      .eq(
        "follower_id",
        followerId
      )
      .eq(
        "following_id",
        followingId
      )
      .select(
        `
          id,
          follower_id,
          following_id,
          created_at
        `
      );

    if (error) {
      console.error(
        "Follow DELETE error:",
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

    if (
      !data ||
      data.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu kullanıcıyı zaten takip etmiyorsunuz.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      following: false,
      follow: data[0],
    });
  } catch (error) {
    console.error(
      "Follows DELETE server error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Takip bırakma sırasında bir sunucu hatası oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}
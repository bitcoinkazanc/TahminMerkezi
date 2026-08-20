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

export async function GET(request, context) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Kullanıcı ID bilgisi gerekli.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: user, error } = await supabase
      .from("users")
      .select(`
        id,
        telegram_id,
        username,
        first_name,
        last_name,
        avatar_url,
        created_at
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("User profile GET error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Kullanıcı profili alınamadı.",
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

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("User profile GET server error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Profil alınırken bir sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}
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
    const limitParam = Number(searchParams.get("limit") || 50);
    const limit = Math.min(Math.max(limitParam, 1), 100);

    let query = supabase
      .from("messages")
      .select(`
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
      `)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (matchId) {
      query = query.eq("match_id", matchId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Messages GET error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messages: data || [],
    });
  } catch (error) {
    console.error("Messages GET server error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Mesajlar alınırken bir sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const userId = body?.user_id;
    const content = body?.content;
    const matchId = body?.match_id || null;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Kullanıcı bilgisi gerekli.",
        },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Mesaj boş olamaz.",
        },
        { status: 400 }
      );
    }

    const cleanContent = content.trim();

    if (!cleanContent) {
      return NextResponse.json(
        {
          success: false,
          error: "Mesaj boş olamaz.",
        },
        { status: 400 }
      );
    }

    if (cleanContent.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: "Mesaj en fazla 1000 karakter olabilir.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (userError) {
      console.error("User lookup error:", userError);

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

    if (matchId) {
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .select("id")
        .eq("id", matchId)
        .maybeSingle();

      if (matchError) {
        console.error("Match lookup error:", matchError);

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
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        user_id: userId,
        match_id: matchId,
        content: cleanContent,
      })
      .select(`
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
      `)
      .single();

    if (error) {
      console.error("Messages POST error:", error);

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
        message: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Messages POST server error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Mesaj gönderilirken bir sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}
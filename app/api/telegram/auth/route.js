import { NextResponse } from "next/server";
import crypto from "crypto";
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

function validateTelegramInitData(initData) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing.");
  }

  if (!initData || typeof initData !== "string") {
    return {
      valid: false,
      user: null,
    };
  }

  const params = new URLSearchParams(initData);

  const receivedHash = params.get("hash");

  if (!receivedHash) {
    return {
      valid: false,
      user: null,
    };
  }

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const receivedBuffer = Buffer.from(receivedHash, "hex");
  const calculatedBuffer = Buffer.from(calculatedHash, "hex");

  if (
    receivedBuffer.length !== calculatedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, calculatedBuffer)
  ) {
    return {
      valid: false,
      user: null,
    };
  }

  const authDate = Number(params.get("auth_date"));

  if (!authDate || Number.isNaN(authDate)) {
    return {
      valid: false,
      user: null,
    };
  }

  const currentTime = Math.floor(Date.now() / 1000);

  // Telegram initData'nın 24 saatten eski olmasına izin verme.
  if (currentTime - authDate > 86400) {
    return {
      valid: false,
      user: null,
    };
  }

  let user = null;

  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    user = null;
  }

  if (!user || !user.id) {
    return {
      valid: false,
      user: null,
    };
  }

  return {
    valid: true,
    user,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();

    const initData = body?.initData;

    if (!initData) {
      return NextResponse.json(
        {
          success: false,
          error: "Telegram initData bulunamadı.",
        },
        { status: 400 }
      );
    }

    const telegramResult = validateTelegramInitData(initData);

    if (!telegramResult.valid || !telegramResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz veya süresi dolmuş Telegram oturumu.",
        },
        { status: 401 }
      );
    }

    const telegramUser = telegramResult.user;

    const supabase = getSupabase();

    const userData = {
      telegram_id: Number(telegramUser.id),
      username: telegramUser.username || null,
      first_name: telegramUser.first_name || null,
      last_name: telegramUser.last_name || null,
      avatar_url: telegramUser.photo_url || null,
      updated_at: new Date().toISOString(),
    };

    const { data: user, error } = await supabase
      .from("users")
      .upsert(userData, {
        onConflict: "telegram_id",
      })
      .select(`
        id,
        telegram_id,
        username,
        first_name,
        last_name,
        avatar_url,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error("Telegram user upsert error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Kullanıcı Supabase'e kaydedilemedi.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Telegram authentication error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Telegram doğrulaması sırasında sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}
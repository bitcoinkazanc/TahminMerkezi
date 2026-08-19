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

    const matchId = searchParams.get("id");
    const status = searchParams.get("status");
    const limitParam = Number(searchParams.get("limit") || 50);
    const limit = Math.min(Math.max(limitParam, 1), 100);

    let query = supabase
      .from("matches")
      .select(`
        id,
        external_id,
        league,
        league_logo,
        home_team,
        away_team,
        home_logo,
        away_logo,
        match_date,
        status,
        created_at,
        updated_at
      `)
      .order("match_date", { ascending: true })
      .limit(limit);

    if (matchId) {
      query = query.eq("id", matchId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Matches GET error:", error);

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
      matches: data || [],
    });
  } catch (error) {
    console.error("Matches GET server error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Maçlar alınırken bir sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      external_id,
      league,
      league_logo,
      home_team,
      away_team,
      home_logo,
      away_logo,
      match_date,
      status = "scheduled",
    } = body || {};

    if (!home_team || !away_team || !match_date) {
      return NextResponse.json(
        {
          success: false,
          error: "Ev sahibi, deplasman ve maç tarihi zorunludur.",
        },
        { status: 400 }
      );
    }

    const validStatuses = [
      "scheduled",
      "live",
      "finished",
      "postponed",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz maç durumu.",
        },
        { status: 400 }
      );
    }

    const parsedDate = new Date(match_date);

    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz maç tarihi.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const matchData = {
      external_id: external_id || null,
      league: league || null,
      league_logo: league_logo || null,
      home_team: String(home_team).trim(),
      away_team: String(away_team).trim(),
      home_logo: home_logo || null,
      away_logo: away_logo || null,
      match_date: parsedDate.toISOString(),
      status,
    };

    let result;

    if (external_id) {
      result = await supabase
        .from("matches")
        .upsert(matchData, {
          onConflict: "external_id",
        })
        .select(`
          id,
          external_id,
          league,
          league_logo,
          home_team,
          away_team,
          home_logo,
          away_logo,
          match_date,
          status,
          created_at,
          updated_at
        `)
        .single();
    } else {
      result = await supabase
        .from("matches")
        .insert(matchData)
        .select(`
          id,
          external_id,
          league,
          league_logo,
          home_team,
          away_team,
          home_logo,
          away_logo,
          match_date,
          status,
          created_at,
          updated_at
        `)
        .single();
    }

    if (result.error) {
      console.error("Matches POST error:", result.error);

      return NextResponse.json(
        {
          success: false,
          error: result.error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        match: result.data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Matches POST server error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Maç kaydedilirken bir sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}
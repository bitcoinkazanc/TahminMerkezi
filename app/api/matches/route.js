import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMatches } from "../../../../lib/football-api";

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

function normalizeMatch(match) {
  const homeTeam =
    match.home_team ||
    match.homeTeam ||
    match.home?.name ||
    match.home?.team?.name ||
    "Bilinmiyor";

  const awayTeam =
    match.away_team ||
    match.awayTeam ||
    match.away?.name ||
    match.away?.team?.name ||
    "Bilinmiyor";

  const externalId =
    match.id ||
    match.match_id ||
    match.external_id ||
    match.slug;

  const matchDate =
    match.match_date ||
    match.matchDate ||
    match.start_time ||
    match.startTime ||
    match.date ||
    match.start_at;

  const league =
    match.league ||
    match.competition?.name ||
    match.tournament?.name ||
    match.league_name ||
    null;

  const leagueLogo =
    match.league_logo ||
    match.competition?.logo ||
    match.tournament?.logo ||
    null;

  const homeLogo =
    match.home_logo ||
    match.home?.logo ||
    match.home?.team?.logo ||
    null;

  const awayLogo =
    match.away_logo ||
    match.away?.logo ||
    match.away?.team?.logo ||
    null;

  let status = "scheduled";

  const rawStatus = String(
    match.status ||
      match.match_status ||
      match.state ||
      ""
  ).toLowerCase();

  if (
    rawStatus.includes("live") ||
    rawStatus.includes("inplay") ||
    rawStatus.includes("in-play")
  ) {
    status = "live";
  } else if (
    rawStatus.includes("finish") ||
    rawStatus.includes("ended") ||
    rawStatus.includes("completed")
  ) {
    status = "finished";
  } else if (
    rawStatus.includes("postpon")
  ) {
    status = "postponed";
  } else if (
    rawStatus.includes("cancel")
  ) {
    status = "cancelled";
  }

  return {
    external_id: externalId
      ? String(externalId)
      : null,
    league,
    league_logo: leagueLogo,
    home_team: String(homeTeam).trim(),
    away_team: String(awayTeam).trim(),
    home_logo: homeLogo,
    away_logo: awayLogo,
    match_date: matchDate
      ? new Date(matchDate).toISOString()
      : null,
    status,
  };
}

export async function GET(request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    const matchId = searchParams.get("id");
    const status = searchParams.get("status");
    const limitParam = Number(
      searchParams.get("limit") || 50
    );

    const limit = Math.min(
      Math.max(limitParam, 1),
      100
    );

    /*
     * Önce SportScore'dan güncel maçları alıyoruz.
     */
    const sportScoreData = await getMatches(
      Math.min(limit, 50)
    );

    const sportScoreMatches =
      Array.isArray(sportScoreData?.matches)
        ? sportScoreData.matches
        : [];

    /*
     * SportScore verilerini Supabase formatına çeviriyoruz.
     */
    const normalizedMatches =
      sportScoreMatches
        .map(normalizeMatch)
        .filter(
          (match) =>
            match.external_id &&
            match.home_team !== "Bilinmiyor" &&
            match.away_team !== "Bilinmiyor" &&
            match.match_date
        );

    /*
     * Supabase'e kaydet.
     */
    if (normalizedMatches.length > 0) {
      const { error: upsertError } =
        await supabase
          .from("matches")
          .upsert(normalizedMatches, {
            onConflict: "external_id",
          });

      if (upsertError) {
        console.error(
          "SportScore matches upsert error:",
          upsertError
        );
      }
    }

    /*
     * Artık Supabase'den uygulamaya maçları gönderiyoruz.
     */
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
      .order("match_date", {
        ascending: true,
      })
      .limit(limit);

    if (matchId) {
      query = query.eq("id", matchId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "Matches GET error:",
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

    return NextResponse.json({
      success: true,
      matches: data || [],
      source: "SportScore",
    });
  } catch (error) {
    console.error(
      "Matches GET server error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Maçlar alınırken bir sunucu hatası oluştu.",
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

    if (
      !home_team ||
      !away_team ||
      !match_date
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ev sahibi, deplasman ve maç tarihi zorunludur.",
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

    const parsedDate = new Date(
      match_date
    );

    if (
      Number.isNaN(parsedDate.getTime())
    ) {
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
      external_id:
        external_id || null,
      league: league || null,
      league_logo:
        league_logo || null,
      home_team: String(
        home_team
      ).trim(),
      away_team: String(
        away_team
      ).trim(),
      home_logo:
        home_logo || null,
      away_logo:
        away_logo || null,
      match_date:
        parsedDate.toISOString(),
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
      console.error(
        "Matches POST error:",
        result.error
      );

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
    console.error(
      "Matches POST server error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Maç kaydedilirken bir sunucu hatası oluştu.",
      },
      { status: 500 }
    );
  }
}
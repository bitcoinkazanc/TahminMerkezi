import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMatches } from "../../../lib/football-api";

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

function toScore(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function normalizeMatch(match) {
  if (
    !match ||
    !match.home ||
    !match.away ||
    !match.time ||
    !match.url
  ) {
    return null;
  }

  const parsedDate =
    new Date(match.time);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return null;
  }

  return {
    external_id:
      String(match.url),

    league:
      match.competition || null,

    league_logo:
      match.competition_logo || null,

    home_team:
      String(match.home).trim(),

    away_team:
      String(match.away).trim(),

    home_logo:
      match.home_logo || null,

    away_logo:
      match.away_logo || null,

    match_date:
      parsedDate.toISOString(),

    status:
      match.status || "scheduled",

    home_score:
      toScore(match.home_score),

    away_score:
      toScore(match.away_score),
  };
}

export async function GET() {
  try {
    const supabase =
      getSupabase();

    const sportScoreData =
      await getMatches(50);

    const sourceMatches =
      Array.isArray(
        sportScoreData?.matches
      )
        ? sportScoreData.matches
        : [];

    /*
     * Özellikle skoru olan ilk maçı buluyoruz.
     */
    const sourceMatch =
      sourceMatches.find(
        (match) =>
          match?.home_score !== null &&
          match?.home_score !== undefined &&
          match?.away_score !== null &&
          match?.away_score !== undefined
      );

    if (!sourceMatch) {
      return NextResponse.json({
        success: false,
        error:
          "SportScore cevabında skor bulunan maç bulunamadı.",
      });
    }

    /*
     * SportScore'dan gelen ham veri.
     */
    const normalizedMatch =
      normalizeMatch(sourceMatch);

    /*
     * Supabase'e tam olarak hangi nesneyi
     * gönderdiğimizi görüyoruz.
     */
    const {
      data,
      error,
    } = await supabase
      .from("matches")
      .upsert(
        normalizedMatch,
        {
          onConflict:
            "external_id",
        }
      )
      .select(`
        id,
        external_id,
        home_team,
        away_team,
        status,
        home_score,
        away_score
      `)
      .single();

    return NextResponse.json({
      success: true,

      sportscore_raw: {
        home:
          sourceMatch.home,

        away:
          sourceMatch.away,

        home_score:
          sourceMatch.home_score,

        away_score:
          sourceMatch.away_score,

        status:
          sourceMatch.status,

        url:
          sourceMatch.url,
      },

      normalized_for_supabase:
        normalizedMatch,

      supabase_result:
        data,

      supabase_error:
        error
          ? {
              message:
                error.message,

              details:
                error.details,

              hint:
                error.hint,

              code:
                error.code,
            }
          : null,
    });
  } catch (error) {
    console.error(
      "Score debug error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Test sırasında hata oluştu.",
      },
      {
        status: 500,
      }
    );
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMatches } from "../../../../lib/football-api";

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

export async function GET() {
  const startedAt = Date.now();

  try {
    const supabase = getSupabase();

    console.log(
      "================================="
    );
    console.log(
      "MATCH SYNC BAŞLADI"
    );
    console.log(
      "================================="
    );

    /*
     * Mackolik'ten güncel maçları al.
     */
    const matches = await getMatches();

    console.log(
      "Mackolik maç sayısı:",
      matches.length
    );

    if (!matches.length) {
      return NextResponse.json({
        success: true,
        message:
          "Mackolik'ten maç gelmedi.",
        total: 0,
        inserted: 0,
        updated: 0,
        duration_ms:
          Date.now() - startedAt,
      });
    }

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    /*
     * Her maçı external_id üzerinden
     * INSERT / UPDATE yap.
     */
    for (const match of matches) {
      if (!match?.external_id) {
        console.warn(
          "external_id olmayan maç atlandı:",
          match
        );

        failed++;
        continue;
      }

      if (
        !match.home_team ||
        !match.away_team ||
        !match.match_date
      ) {
        console.warn(
          "Eksik maç bilgisi nedeniyle atlandı:",
          match.external_id
        );

        failed++;
        continue;
      }

      const row = {
        external_id:
          match.external_id,

        league:
          match.league || null,

        league_logo:
          match.league_logo || null,

        home_team:
          match.home_team,

        away_team:
          match.away_team,

        home_logo:
          match.home_logo || null,

        away_logo:
          match.away_logo || null,

        match_date:
          match.match_date,

        status:
          match.status || "scheduled",

        home_score:
          match.home_score ?? null,

        away_score:
          match.away_score ?? null,

        home_team_id:
          match.home_team_id || null,

        away_team_id:
          match.away_team_id || null,
      };

      /*
       * external_id UNIQUE olduğu için:
       *
       * varsa UPDATE
       * yoksa INSERT
       */
      const { data, error } =
        await supabase
          .from("matches")
          .upsert(
            row,
            {
              onConflict:
                "external_id",
            }
          )
          .select("id")
          .single();

      if (error) {
        console.error(
          "Maç sync hatası:",
          match.external_id,
          error
        );

        failed++;
        continue;
      }

      /*
       * upsert sonucunda yeni/eski ayrımını
       * kesin olarak anlamak için ayrıca
       * kayıt öncesi kontrol yapmıyoruz.
       *
       * Başarılı senkronizasyon olarak sayıyoruz.
       */
      updated++;

      console.log(
        "SYNC OK:",
        match.home_team,
        "-",
        match.away_team,
        "Supabase ID:",
        data?.id
      );
    }

    console.log(
      "================================="
    );
    console.log(
      "MATCH SYNC TAMAMLANDI"
    );
    console.log(
      "Toplam:",
      matches.length
    );
    console.log(
      "Başarılı:",
      updated
    );
    console.log(
      "Hatalı:",
      failed
    );
    console.log(
      "================================="
    );

    return NextResponse.json({
      success: true,

      message:
        "Maçlar Supabase ile senkronize edildi.",

      total:
        matches.length,

      synced:
        updated,

      failed,

      duration_ms:
        Date.now() - startedAt,
    });
  } catch (error) {
    console.error(
      "MATCH SYNC SERVER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Maç senkronizasyonu başarısız.",
      },
      {
        status: 500,
      }
    );
  }
}
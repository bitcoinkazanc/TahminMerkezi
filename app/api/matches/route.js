import { NextResponse } from "next/server";
import { getMatches, getMatch } from "../../../lib/football-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  const startedAt = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    const requestedId = searchParams.get("id");
    const sport = searchParams.get("sport");
    const status = searchParams.get("status");

    console.log("=================================");
    console.log("MACKOLIK /api/matches BAŞLADI");
    console.log("id:", requestedId);
    console.log("sport:", sport);
    console.log("status:", status);
    console.log("=================================");

    // Tek maç
    if (requestedId) {
      console.log(
        "Tek maç isteniyor:",
        requestedId
      );

      const match = await getMatch(
        requestedId
      );

      console.log(
        "Tek maç sonucu:",
        match ? "BULUNDU" : "BULUNAMADI"
      );

      if (!match) {
        return NextResponse.json(
          {
            success: false,
            error: "Maç bulunamadı.",
            source: "Mackolik",
            duration_ms:
              Date.now() - startedAt,
          },
          {
            status: 404,
            headers: {
              "Cache-Control":
                "no-store, no-cache, must-revalidate, proxy-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );
      }

      return NextResponse.json(
        {
          success: true,
          source: "Mackolik",
          match,
          duration_ms:
            Date.now() - startedAt,
        },
        {
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    console.log(
      "Maçkolik getMatches() çağrılıyor..."
    );

    const allMatches =
      await getMatches();

    console.log(
      "Maçkolik getMatches() tamamlandı."
    );

    console.log(
      "Toplam maç:",
      allMatches.length
    );

    let matches = allMatches;

    if (sport) {
      const wantedSport =
        sport.toLowerCase();

      matches = matches.filter(
        (match) =>
          String(
            match.sport || ""
          ).toLowerCase() ===
          wantedSport
      );
    }

    if (status) {
      const wantedStatus =
        status.toLowerCase();

      matches = matches.filter(
        (match) =>
          String(
            match.status || ""
          ).toLowerCase() ===
          wantedStatus
      );
    }

    console.log(
      "Filtre sonrası maç:",
      matches.length
    );

    return NextResponse.json(
      {
        success: true,
        source: "Mackolik",
        count: matches.length,
        matches,
        duration_ms:
          Date.now() - startedAt,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error(
      "================================="
    );

    console.error(
      "MACKOLIK /api/matches HATASI"
    );

    console.error(
      error
    );

    console.error(
      "================================="
    );

    return NextResponse.json(
      {
        success: false,
        source: "Mackolik",
        error:
          error?.message ||
          "Maç verileri alınamadı.",
        error_name:
          error?.name || null,
        duration_ms:
          Date.now() - startedAt,
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}
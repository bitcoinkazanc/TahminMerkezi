import { NextResponse } from "next/server";

export async function GET() {
  const url =
    "https://www.tff.org/default.aspx?pageID=198";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language":
          "tr-TR,tr;q=0.9,en;q=0.8",
      },
      cache: "no-store",
    });

    const html = await response.text();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      contentType:
        response.headers.get("content-type"),
      htmlLength: html.length,
      containsTff: html.includes("TFF"),
      containsSuperLig:
        html.toLowerCase().includes("süper lig"),
      contains2026:
        html.includes("2026-2027"),
      preview:
        html.substring(0, 500),
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
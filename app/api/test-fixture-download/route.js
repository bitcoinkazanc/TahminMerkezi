import { NextResponse } from "next/server";

export async function GET() {
  const url =
    "https://www.mackolik.com/perform/p0/ajax/components/competition/livescores/json" +
    "?matchDate=21-08-2026" +
    "&sports[]=Soccer";

  try {
    const response =
      await fetch(url, {
        method: "GET",
        headers: {
          Accept:
            "application/json, text/plain, */*",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
          Referer:
            "https://www.mackolik.com/",
          Origin:
            "https://www.mackolik.com",
        },
        cache: "no-store",
      });

    const text =
      await response.text();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      contentType:
        response.headers.get(
          "content-type"
        ),
      dataLength: text.length,
      preview:
        text.substring(0, 10000),
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Bilinmeyen hata",
      },
      {
        status: 500,
      }
    );
  }
}
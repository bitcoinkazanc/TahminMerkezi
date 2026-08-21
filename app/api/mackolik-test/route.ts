import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MACKOLIK_URL =
  "https://www.mackolik.com/perform/p0/ajax/components/competition/livescores/json";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const requestedDate =
      searchParams.get("date") ||
      new Date().toISOString().slice(0, 10);

    const targetUrl = new URL(MACKOLIK_URL);

    targetUrl.searchParams.append("sports[]", "Soccer");
    targetUrl.searchParams.set("matchDate", requestedDate);

    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
        Referer: "https://www.mackolik.com/canli-sonuclar",
        Origin: "https://www.mackolik.com",
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    const rawText = await response.text();

    let parsedData: unknown = null;

    try {
      parsedData = JSON.parse(rawText);
    } catch {
      parsedData = null;
    }

    return NextResponse.json(
      {
        success: response.ok,
        test: "mackolik",
        request: {
          date: requestedDate,
          url: targetUrl.toString(),
        },
        mackolik: {
          status: response.status,
          statusText: response.statusText,
          contentType,
        },
        response: {
          isJson: parsedData !== null,
          rawLength: rawText.length,
          data: parsedData,
          rawPreview:
            parsedData === null
              ? rawText.slice(0, 5000)
              : undefined,
        },
      },
      {
        status: response.ok ? 200 : response.status,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        test: "mackolik",
        error:
          error instanceof Error
            ? error.message
            : "Bilinmeyen hata",
      },
      {
        status: 500,
      }
    );
  }
}
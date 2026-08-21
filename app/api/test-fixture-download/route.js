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

    const data =
      await response.json();

    const rootKeys =
      Object.keys(data || {});

    const dataObject =
      data?.data || {};

    const dataKeys =
      Object.keys(
        dataObject
      );

    const structure = {};

    for (
      const key of dataKeys
    ) {
      const value =
        dataObject[key];

      structure[key] = {
        type:
          Array.isArray(value)
            ? "array"
            : typeof value,

        length:
          Array.isArray(value)
            ? value.length
            : value &&
              typeof value === "object"
              ? Object.keys(value).length
              : null,

        sampleKeys:
          value &&
          typeof value === "object"
          ? Object.keys(value)
              .slice(0, 20)
          : [],

        sample:
          Array.isArray(value)
            ? value.slice(0, 2)
            : value &&
              typeof value === "object"
              ? Object.fromEntries(
                  Object.entries(value)
                    .slice(0, 2)
                )
              : value
      };
    }

    return NextResponse.json({
      success: true,
      httpStatus:
        response.status,

      rootKeys,

      dataKeys,

      structure
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Bilinmeyen hata"
      },
      {
        status: 500
      }
    );
  }
}
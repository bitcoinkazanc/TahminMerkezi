export async function GET() {
  try {
    const apiKey =
      process.env.KICKOFF_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          success: false,
          message:
            "KICKOFF_API_KEY bulunamadı. Vercel Environment Variables kontrol edilmeli.",
        },
        { status: 500 }
      );
    }

    const url =
      "https://api.kickoffapi.com/api/v1/fixtures?live=all";

    const response =
      await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-api-key": apiKey,
        },
        cache: "no-store",
      });

    const text =
      await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = {
        raw: text,
      };
    }

    return Response.json(
      {
        success: response.ok,
        status: response.status,
        results:
          data?.results ?? null,
        matchCount:
          Array.isArray(data?.response)
            ? data.response.length
            : 0,
        rateLimit: {
          limit:
            response.headers.get(
              "X-RateLimit-Limit"
            ),
          remaining:
            response.headers.get(
              "X-RateLimit-Remaining"
            ),
          reset:
            response.headers.get(
              "X-RateLimit-Reset"
            ),
        },
        matches:
          Array.isArray(data?.response)
            ? data.response.slice(0, 10)
            : data,
      },
      {
        status: response.ok
          ? 200
          : response.status,
      }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message:
          "KickoffAPI bağlantı hatası.",
        error:
          error?.message ||
          "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}
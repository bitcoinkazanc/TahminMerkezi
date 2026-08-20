const SOURCES = {
  superLig:
    "https://fixturedownload.com/feed/json/super-lig-2026",

  premierLeague:
    "https://fixturedownload.com/feed/json/epl-2026",
};


async function testSource(name, url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "TahminMerkezi/1.0",
      },
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      return {
        name,
        success: false,
        status: response.status,
        error: text.substring(0, 1000),
      };
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      return {
        name,
        success: false,
        status: response.status,
        error: "JSON parse hatası",
        parseError: error.message,
        preview: text.substring(0, 2000),
      };
    }

    const matches = Array.isArray(data)
      ? data
      : Array.isArray(data.matches)
        ? data.matches
        : [];

    return {
      name,
      success: true,
      status: response.status,
      dataType: Array.isArray(data)
        ? "array"
        : typeof data,
      matchCount: matches.length,
      firstMatches: matches.slice(0, 5),
    };

  } catch (error) {
    return {
      name,
      success: false,
      errorType: error.name,
      error: error.message,
    };
  }
}


export async function GET() {
  const results = await Promise.all([
    testSource(
      "Türkiye Süper Lig",
      SOURCES.superLig
    ),

    testSource(
      "Premier League",
      SOURCES.premierLeague
    ),
  ]);

  const successCount =
    results.filter(
      (item) => item.success
    ).length;

  return Response.json({
    success: successCount === results.length,

    message:
      successCount === results.length
        ? "Fixture Download server-side erişimi başarılı."
        : "En az bir kaynak server-side erişimde başarısız.",

    successCount,

    totalSources: results.length,

    results,
  });
}
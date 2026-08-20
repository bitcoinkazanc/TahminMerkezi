const SOURCES = [
  ["🇹🇷 Süper Lig", "super-lig-2026"],
  ["🇹🇷 1. Lig", "1-lig-2026"],
  ["🇹🇷 2. Lig", "2-lig-2026"],
  ["🇹🇷 3. Lig", "3-lig-2026"],

  ["🇬🇧 Premier League", "epl-2026"],
  ["🇬🇧 Championship", "championship-2026"],
  ["🇬🇧 League One", "league-one-2026"],
  ["🇬🇧 League Two", "league-two-2026"],

  ["🇪🇸 La Liga", "la-liga-2026"],
  ["🇪🇸 Segunda", "segunda-division-2026"],

  ["🇮🇹 Serie A", "serie-a-2026"],
  ["🇮🇹 Serie B", "serie-b-2026"],

  ["🇩🇪 Bundesliga", "bundesliga-2026"],
  ["🇩🇪 2. Bundesliga", "2-bundesliga-2026"],

  ["🇫🇷 Ligue 1", "ligue-1-2026"],
  ["🇫🇷 Ligue 2", "ligue-2-2026"],

  ["🇵🇹 Primeira Liga", "primeira-liga-2026"],
  ["🇵🇹 Liga Portugal 2", "liga-portugal-2-2026"],

  ["🇳🇱 Eredivisie", "eredivisie-2026"],
  ["🇳🇱 Eerste Divisie", "eerste-divisie-2026"],

  ["🇧🇪 Pro League", "belgian-pro-league-2026"],

  ["🏆 Champions League", "champions-league-2026"],
  ["🏆 Europa League", "europa-league-2026"],
  ["🏆 Conference League", "europa-conference-league-2026"],
];


async function checkLeague(name, slug) {
  const url =
    `https://fixturedownload.com/feed/json/${slug}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "TahminMerkezi/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        name,
        slug,
        status: response.status,
        success: false,
        matches: 0,
      };
    }

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return {
        name,
        slug,
        status: response.status,
        success: false,
        matches: 0,
        error: "JSON parse hatası",
      };
    }

    const matches = Array.isArray(data)
      ? data
      : Array.isArray(data.matches)
        ? data.matches
        : [];

    return {
      name,
      slug,
      status: response.status,
      success: true,
      matches: matches.length,
    };

  } catch (error) {
    return {
      name,
      slug,
      status: null,
      success: false,
      matches: 0,
      error: error.message,
    };
  }
}


export async function GET() {
  const results = [];

  for (const [name, slug] of SOURCES) {
    const result =
      await checkLeague(name, slug);

    results.push(result);
  }

  const available =
    results.filter(
      (item) => item.success
    );

  const missing =
    results.filter(
      (item) => !item.success
    );

  return Response.json({
    success: true,

    summary: {
      total: results.length,
      available: available.length,
      missing: missing.length,
    },

    available,

    missing,

    results,
  });
}
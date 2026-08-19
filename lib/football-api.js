const SPORTScore_BASE_URL = "https://sportscore.com";

const SPORT = "football";

function buildUrl(endpoint, params = {}) {
  const url = new URL(
    `${SPORTScore_BASE_URL}${endpoint}`
  );

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      url.searchParams.set(key, String(value));
    }
  });

  url.searchParams.set("src", "tahminmerkezi");

  return url.toString();
}

async function sportScoreRequest(
  endpoint,
  params = {}
) {
  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `SportScore API hatası: ${response.status}`
    );
  }

  const data = await response.json();

  return data;
}

export async function getMatches(limit = 50) {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 10, 1),
    50
  );

  return sportScoreRequest(
    "/api/widget/matches/",
    {
      sport: SPORT,
      limit: safeLimit,
    }
  );
}

export async function getMatch(slug) {
  if (!slug) {
    throw new Error("Maç slug bilgisi gerekli.");
  }

  return sportScoreRequest(
    "/api/widget/match/",
    {
      sport: SPORT,
      slug,
    }
  );
}

export async function getTeamMatches(
  slug,
  limit = 10
) {
  if (!slug) {
    throw new Error("Takım slug bilgisi gerekli.");
  }

  const safeLimit = Math.min(
    Math.max(Number(limit) || 10, 1),
    30
  );

  return sportScoreRequest(
    "/api/widget/team/",
    {
      sport: SPORT,
      slug,
      limit: safeLimit,
    }
  );
}

export async function getStandings(slug) {
  if (!slug) {
    throw new Error(
      "Lig/turnuva slug bilgisi gerekli."
    );
  }

  return sportScoreRequest(
    "/api/widget/standings/",
    {
      sport: SPORT,
      slug,
    }
  );
}

export async function getTopScorers(
  slug,
  limit = 20,
  stat = "goals"
) {
  if (!slug) {
    throw new Error(
      "Lig/turnuva slug bilgisi gerekli."
    );
  }

  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    50
  );

  const safeStat =
    stat === "assists" ? "assists" : "goals";

  return sportScoreRequest(
    "/api/widget/topscorers/",
    {
      sport: SPORT,
      slug,
      limit: safeLimit,
      stat: safeStat,
    }
  );
}

export async function getPlayer(slug) {
  if (!slug) {
    throw new Error("Oyuncu slug bilgisi gerekli.");
  }

  return sportScoreRequest(
    "/api/widget/player/",
    {
      sport: SPORT,
      slug,
    }
  );
}

export async function getBracket(slug) {
  if (!slug) {
    throw new Error(
      "Lig/turnuva slug bilgisi gerekli."
    );
  }

  return sportScoreRequest(
    "/api/widget/bracket/",
    {
      sport: SPORT,
      slug,
    }
  );
}

export async function getTracker(id) {
  if (!id) {
    throw new Error("Maç ID bilgisi gerekli.");
  }

  return sportScoreRequest(
    "/api/widget/tracker/",
    {
      sport: SPORT,
      id,
    }
  );
}

export default {
  getMatches,
  getMatch,
  getTeamMatches,
  getStandings,
  getTopScorers,
  getPlayer,
  getBracket,
  getTracker,
};
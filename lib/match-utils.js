export function getMatchStatus(match) {
  const status = String(
    match?.status || ""
  ).toLowerCase();

  const state = String(
    match?.state || ""
  ).toLowerCase();

  const substate = String(
    match?.substate || ""
  ).toLowerCase();

  const statusBox = String(
    match?.status_box_content || ""
  ).toLowerCase();

  if (
    status === "live" ||
    state === "live"
  ) {
    return "live";
  }

  if (
    status === "finished" ||
    status === "completed" ||
    status === "fulltime" ||
    status === "full_time" ||
    state === "finished" ||
    state === "completed" ||
    state === "post" ||
    substate === "fulltime" ||
    substate === "full_time" ||
    statusBox === "bitti"
  ) {
    return "finished";
  }

  if (
    status === "cancelled" ||
    status === "canceled" ||
    state === "cancelled" ||
    state === "canceled"
  ) {
    return "cancelled";
  }

  if (
    status === "postponed" ||
    state === "postponed"
  ) {
    return "postponed";
  }

  return "scheduled";
}


export function getLeaguePriority(match) {
  const league = String(
    match?.league || ""
  )
    .toLowerCase()
    .trim();

  /*
   * Türkiye ligleri
   */
  if (
    league.includes("super lig") ||
    league.includes("süper lig") ||
    league.includes("super league") ||
    league.includes("türkiye süper") ||
    league.includes("turkish super")
  ) {
    return 1;
  }

  if (
    league.includes("1. lig") ||
    league.includes("1 lig") ||
    league.includes("tff 1") ||
    league.includes("turkish first")
  ) {
    return 2;
  }

  if (
    league.includes("2. lig") ||
    league.includes("2 lig") ||
    league.includes("tff 2") ||
    league.includes("turkish second")
  ) {
    return 3;
  }

  if (
    league.includes("3. lig") ||
    league.includes("3 lig") ||
    league.includes("tff 3") ||
    league.includes("turkish third")
  ) {
    return 4;
  }

  /*
   * Diğer büyük ligler
   */
  if (
    league.includes("premier league") ||
    league.includes("ingiltere premier")
  ) {
    return 10;
  }

  if (
    league.includes("la liga") ||
    league.includes("ispanya")
  ) {
    return 11;
  }

  if (
    league.includes("serie a") ||
    league.includes("italya")
  ) {
    return 12;
  }

  if (
    league.includes("bundesliga") ||
    league.includes("almanya")
  ) {
    return 13;
  }

  if (
    league.includes("ligue 1") ||
    league.includes("fransa")
  ) {
    return 14;
  }

  /*
   * Tanınmayan ligler
   */
  return 100;
}


export function sortMatches(matches = []) {
  if (!Array.isArray(matches)) {
    return [];
  }

  return [...matches].sort(
    (a, b) => {
      const statusA =
        getMatchStatus(a);

      const statusB =
        getMatchStatus(b);

      /*
       * Önce lig önceliği
       */
      const leagueA =
        getLeaguePriority(a);

      const leagueB =
        getLeaguePriority(b);

      if (leagueA !== leagueB) {
        return (
          leagueA - leagueB
        );
      }

      /*
       * Aynı lig içinde:
       *
       * CANLI
       * sonra YAKLAŞAN
       * sonra BİTTİ
       */
      const statusPriority = {
        live: 1,
        scheduled: 2,
        postponed: 3,
        cancelled: 4,
        finished: 5,
      };

      const priorityA =
        statusPriority[
          statusA
        ] || 99;

      const priorityB =
        statusPriority[
          statusB
        ] || 99;

      if (
        priorityA !==
        priorityB
      ) {
        return (
          priorityA -
          priorityB
        );
      }

      /*
       * Aynı durumdaki maçları
       * tarih/saat sırasına koy.
       */
      const dateA =
        new Date(
          a?.match_date
        ).getTime();

      const dateB =
        new Date(
          b?.match_date
        ).getTime();

      const validA =
        Number.isFinite(
          dateA
        );

      const validB =
        Number.isFinite(
          dateB
        );

      if (validA && validB) {
        return (
          dateA - dateB
        );
      }

      if (validA) {
        return -1;
      }

      if (validB) {
        return 1;
      }

      return 0;
    }
  );
}
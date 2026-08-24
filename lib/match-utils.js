export function getMatchStatus(match) {
  const status = String(
    match?.status || ""
  )
    .toLowerCase()
    .trim();

  const state = String(
    match?.state || ""
  )
    .toLowerCase()
    .trim();

  const substate = String(
    match?.substate || ""
  )
    .toLowerCase()
    .trim();

  const statusBox = String(
    match?.status_box_content ||
      match?.statusBoxContent ||
      ""
  )
    .toLowerCase()
    .trim();

  /*
   * BİTMİŞ
   *
   * ÖNCE kontrol edilir.
   * Böylece Mackolik "live" bilgisini
   * yanlış bıraksa bile açıkça bitmiş
   * durumlar canlı kabul edilmez.
   */

  if (
    status === "finished" ||
    status === "completed" ||
    status === "fulltime" ||
    status === "full_time" ||
    status === "ended" ||
    status === "end" ||
    status === "ft" ||
    state === "finished" ||
    state === "completed" ||
    state === "fulltime" ||
    state === "full_time" ||
    state === "ended" ||
    state === "end" ||
    state === "post" ||
    substate === "finished" ||
    substate === "completed" ||
    substate === "fulltime" ||
    substate === "full_time" ||
    substate === "ended" ||
    substate === "end" ||
    statusBox === "bitti" ||
    statusBox === "finished" ||
    statusBox === "fulltime" ||
    statusBox === "full time" ||
    statusBox === "ft"
  ) {
    return "finished";
  }

  /*
   * İPTAL
   */

  if (
    status === "cancelled" ||
    status === "canceled" ||
    state === "cancelled" ||
    state === "canceled"
  ) {
    return "cancelled";
  }

  /*
   * ERTELENEN
   */

  if (
    status === "postponed" ||
    state === "postponed"
  ) {
    return "postponed";
  }

  /*
   * CANLI
   */

  if (
    status === "live" ||
    state === "live"
  ) {
    return "live";
  }

  /*
   * BAŞLAMAMIŞ
   */

  return "scheduled";
}


/*
 * LİG ÖNCELİĞİ
 */

export function getLeaguePriority(match) {
  const league = String(
    match?.league || ""
  )
    .toLowerCase()
    .trim();

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

  return 100;
}


/*
 * MAÇ SIRALAMA
 *
 * DURUM HER ŞEYDEN ÖNCE GELİR.
 *
 * 1. CANLI
 * 2. YAKLAŞAN
 * 3. ERTELENEN
 * 4. İPTAL
 * 5. BİTEN
 */

export function sortMatches(matches = []) {
  if (!Array.isArray(matches)) {
    return [];
  }

  const statusPriority = {
    live: 1,
    scheduled: 2,
    postponed: 3,
    cancelled: 4,
    finished: 5,
  };

  return [...matches].sort(
    (a, b) => {
      const statusA =
        getMatchStatus(a);

      const statusB =
        getMatchStatus(b);

      /*
       * ÖNCE DURUM.
       *
       * Lig sıralaması bundan sonra.
       */

      const priorityA =
        statusPriority[statusA] ?? 99;

      const priorityB =
        statusPriority[statusB] ?? 99;

      if (
        priorityA !== priorityB
      ) {
        return (
          priorityA -
          priorityB
        );
      }

      /*
       * AYNI DURUMDA LİG
       */

      const leagueA =
        getLeaguePriority(a);

      const leagueB =
        getLeaguePriority(b);

      if (
        leagueA !== leagueB
      ) {
        return (
          leagueA -
          leagueB
        );
      }

      /*
       * CANLI MAÇLAR
       *
       * Dakikası büyük olan üstte.
       */

      if (
        statusA === "live" &&
        statusB === "live"
      ) {
        const minuteA =
          Number(a?.live_minute);

        const minuteB =
          Number(b?.live_minute);

        if (
          Number.isFinite(minuteA) &&
          Number.isFinite(minuteB) &&
          minuteA !== minuteB
        ) {
          return (
            minuteB -
            minuteA
          );
        }
      }

      /*
       * TARİH
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
        Number.isFinite(dateA);

      const validB =
        Number.isFinite(dateB);

      if (
        validA &&
        validB
      ) {
        /*
         * BİTEN MAÇLAR:
         *
         * Hepsi en alta.
         * Kendi aralarında en yeni
         * biten üstte.
         */

        if (
          statusA === "finished" &&
          statusB === "finished"
        ) {
          return (
            dateB -
            dateA
          );
        }

        /*
         * Yaklaşan / diğer maçlar:
         * en yakın saat üstte.
         */

        return (
          dateA -
          dateB
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
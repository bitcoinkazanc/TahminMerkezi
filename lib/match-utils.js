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
   * BİTMİŞ MAÇ
   *
   * Bunu CANLI kontrolünden önce
   * yapıyoruz.
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
    statusBox === "ft" ||
    statusBox === "finished" ||
    statusBox === "fulltime"
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
 * 1. CANLI
 * 2. BAŞLAMAMIŞ
 * 3. ERTELENEN
 * 4. İPTAL
 * 5. BİTEN
 *
 * ÖNEMLİ:
 * Durum sıralaması lig sıralamasından
 * ÖNCE gelir.
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
       * 1. ÖNCE DURUM
       *
       * Böylece:
       *
       * Biten maç
       * hiçbir zaman
       * canlı veya yaklaşan maçın
       * önüne geçemez.
       */

      const priorityA =
        statusPriority[statusA] ?? 99;

      const priorityB =
        statusPriority[statusB] ?? 99;

      if (
        priorityA !== priorityB
      ) {
        return (
          priorityA - priorityB
        );
      }

      /*
       * 2. AYNI DURUMDA LİG
       */

      const leagueA =
        getLeaguePriority(a);

      const leagueB =
        getLeaguePriority(b);

      if (
        leagueA !== leagueB
      ) {
        return (
          leagueA - leagueB
        );
      }

      /*
       * 3. CANLI MAÇLAR
       *
       * Dakikası büyük olan üstte.
       */

      if (
        statusA === "live" &&
        statusB === "live"
      ) {
        const minuteA =
          Number(
            a?.live_minute
          );

        const minuteB =
          Number(
            b?.live_minute
          );

        const validMinuteA =
          Number.isFinite(
            minuteA
          );

        const validMinuteB =
          Number.isFinite(
            minuteB
          );

        if (
          validMinuteA &&
          validMinuteB &&
          minuteA !== minuteB
        ) {
          return (
            minuteB - minuteA
          );
        }
      }

      /*
       * 4. TARİH
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
         * BİTENLER:
         *
         * En yeni biten maç üstte,
         * ama bütün bitenler
         * listenin EN ALTINDA.
         */

        if (
          statusA === "finished" &&
          statusB === "finished"
        ) {
          return (
            dateB - dateA
          );
        }

        /*
         * Diğer durumlar:
         * en yakın maç üstte.
         */

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
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
      match?.statusBox ||
      match?.status_box ||
      ""
  )
    .toLowerCase()
    .trim();

  /*
   * ==================================================
   * BİTMİŞ MAÇLAR
   * ==================================================
   *
   * ÇOK ÖNEMLİ:
   *
   * Mackolik bazı bitmiş maçları hâlâ:
   *
   * state = live
   *
   * şeklinde gönderebiliyor.
   *
   * Bu nedenle BİTTİ kontrolü,
   * CANLI kontrolünden kesinlikle önce yapılır.
   */

  const finishedValues = [
    "finished",
    "finish",
    "completed",
    "complete",
    "fulltime",
    "full_time",
    "full-time",
    "ended",
    "end",
    "ft",
    "final",
    "post",
    "maç bitti",
    "mac bitti",
    "bitti",
    "maç sonucu",
    "mac sonucu",
    "ms",
    "m.s.",
    "m.s",
  ];

  if (
    finishedValues.includes(status) ||
    finishedValues.includes(state) ||
    finishedValues.includes(substate) ||
    finishedValues.includes(statusBox)
  ) {
    return "finished";
  }

  /*
   * Bazı kaynaklarda bitiş bilgisi daha uzun
   * bir metin olarak gelebilir.
   */

  if (
    statusBox.includes("maç sonucu") ||
    statusBox.includes("mac sonucu") ||
    statusBox.includes("maç bitti") ||
    statusBox.includes("mac bitti") ||
    statusBox.includes("full time") ||
    statusBox.includes("full-time") ||
    statusBox.includes("finished") ||
    statusBox.includes("final") ||
    statusBox === "ms"
  ) {
    return "finished";
  }

  /*
   * ==================================================
   * İPTAL
   * ==================================================
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
   * ==================================================
   * ERTELENEN
   * ==================================================
   */

  if (
    status === "postponed" ||
    state === "postponed"
  ) {
    return "postponed";
  }

  /*
   * ==================================================
   * DEVRE ARASI
   * ==================================================
   *
   * Devre arası canlı maçın bir parçasıdır.
   * Ancak burada ayrı status döndürmüyoruz.
   * Sistem bunu canlı olarak değerlendirebilir.
   */

  if (
    substate === "halftime" ||
    substate === "half_time" ||
    substate === "half-time" ||
    statusBox === "ht" ||
    statusBox === "i̇y" ||
    statusBox === "iy"
  ) {
    return "live";
  }

  /*
   * ==================================================
   * CANLI
   * ==================================================
   *
   * Buraya ancak yukarıdaki BİTTİ kontrollerinden
   * geçmeyen maçlar gelebilir.
   */

  if (
    status === "live" ||
    state === "live"
  ) {
    return "live";
  }

  /*
   * ==================================================
   * BAŞLAMAMIŞ
   * ==================================================
   */

  return "scheduled";
}


/*
 * ==================================================
 * LİG ÖNCELİĞİ
 * ==================================================
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
 * ==================================================
 * MAÇ SIRALAMA
 * ==================================================
 *
 * 1. CANLI
 * 2. BAŞLAMAMIŞ
 * 3. ERTELENEN
 * 4. İPTAL
 * 5. BİTEN
 *
 * ÖNEMLİ:
 *
 * Durum, lig önceliğinden DAHA ÖNCE gelir.
 *
 * Böylece bitmiş bir Süper Lig maçı,
 * canlı bir alt lig maçının önüne geçemez.
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
       * ==================================================
       * 1. ÖNCE MAÇ DURUMU
       * ==================================================
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
       * ==================================================
       * 2. AYNI DURUMDA LİG ÖNCELİĞİ
       * ==================================================
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
       * ==================================================
       * 3. CANLI MAÇLAR
       * ==================================================
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
            minuteB - minuteA
          );
        }
      }

      /*
       * ==================================================
       * 4. MAÇ TARİHİ
       * ==================================================
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
         * ==================================================
         * BİTEN MAÇLAR
         * ==================================================
         *
         * En son biten maç üstte.
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
         * ==================================================
         * YAKLAŞAN MAÇLAR
         * ==================================================
         *
         * Başlama zamanı en yakın olan üstte.
         */

        if (
          statusA === "scheduled" &&
          statusB === "scheduled"
        ) {
          return (
            dateA - dateB
          );
        }

        /*
         * Diğer durumlarda tarih sıralaması.
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
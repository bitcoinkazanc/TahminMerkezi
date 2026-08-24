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
   * --------------------------------------------------
   * KESİN BİTMİŞ MAÇ
   * --------------------------------------------------
   *
   * ÖNCE kontrol ediyoruz.
   *
   * Çünkü Mackolik bazı maçlarda:
   *
   * state = live
   * substate = fullTime
   *
   * şeklinde veri gönderebiliyor.
   */

  if (
    [
      "finished",
      "completed",
      "fulltime",
      "full_time",
      "ended",
      "end",
      "ft",
      "post",
    ].includes(status) ||
    [
      "finished",
      "completed",
      "fulltime",
      "full_time",
      "ended",
      "end",
      "ft",
      "post",
    ].includes(state) ||
    [
      "finished",
      "completed",
      "fulltime",
      "full_time",
      "ended",
      "end",
      "ft",
    ].includes(substate) ||
    [
      "bitti",
      "ft",
      "fulltime",
      "full time",
      "finished",
      "ended",
    ].includes(statusBox)
  ) {
    return "finished";
  }

  /*
   * --------------------------------------------------
   * İPTAL
   * --------------------------------------------------
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
   * --------------------------------------------------
   * ERTELENEN
   * --------------------------------------------------
   */

  if (
    status === "postponed" ||
    state === "postponed"
  ) {
    return "postponed";
  }

  /*
   * --------------------------------------------------
   * CANLI
   * --------------------------------------------------
   */

  if (
    status === "live" ||
    state === "live"
  ) {
    /*
     * Mackolik bazen state=live bırakıp
     * maçı aslında bitirmiş olabiliyor.
     *
     * Maç zamanı geçmiş ve skor mevcutsa
     * eski gece maçlarının canlı kalmasını
     * engelle.
     */

    const matchDate = new Date(
      match?.match_date
    ).getTime();

    const homeScore =
      Number(match?.home_score);

    const awayScore =
      Number(match?.away_score);

    const hasScore =
      Number.isFinite(homeScore) &&
      Number.isFinite(awayScore);

    if (
      Number.isFinite(matchDate) &&
      matchDate < Date.now() &&
      hasScore
    ) {
      /*
       * Penaltı atışı devam ediyorsa
       * maç hâlâ canlıdır.
       */
      if (
        substate === "penalties" ||
        substate === "penalty" ||
        statusBox === "pen"
      ) {
        return "live";
      }

      /*
       * Maç başlangıcından çok uzun süre
       * geçmişse artık canlı kabul etme.
       *
       * 4 saat güvenli üst sınır.
       */
      const elapsed =
        Date.now() - matchDate;

      if (
        elapsed >
        4 * 60 * 60 * 1000
      ) {
        return "finished";
      }
    }

    return "live";
  }

  /*
   * --------------------------------------------------
   * PLANLANMIŞ / YAKLAŞAN
   * --------------------------------------------------
   */

  return "scheduled";
}


/*
 * --------------------------------------------------
 * LİG ÖNCELİĞİ
 * --------------------------------------------------
 */

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

  return 100;
}


/*
 * --------------------------------------------------
 * MAÇ SIRALAMA
 * --------------------------------------------------
 *
 * 1. Canlı
 * 2. Yaklaşan
 * 3. Ertelenen
 * 4. İptal
 * 5. Biten
 */

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
       * Lig önceliği.
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
       * Durum önceliği.
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
        ] ?? 99;

      const priorityB =
        statusPriority[
          statusB
        ] ?? 99;

      if (
        priorityA !==
        priorityB
      ) {
        return (
          priorityA - priorityB
        );
      }

      /*
       * CANLI MAÇLAR:
       *
       * Dakikası büyük olan üstte.
       */

      if (
        statusA === "live" &&
        statusB === "live"
      ) {
        const minuteA =
          Number.isFinite(
            Number(
              a?.live_minute
            )
          )
            ? Number(
                a.live_minute
              )
            : -1;

        const minuteB =
          Number.isFinite(
            Number(
              b?.live_minute
            )
          )
            ? Number(
                b.live_minute
              )
            : -1;

        if (
          minuteA !==
          minuteB
        ) {
          return (
            minuteB -
            minuteA
          );
        }
      }

      /*
       * YAKLAŞAN MAÇLAR:
       *
       * Başlama zamanı en yakın
       * olan üstte.
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

      if (
        validA &&
        validB
      ) {
        /*
         * Biten maçlar:
         *
         * En yeni biten üstte.
         */

        if (
          statusA ===
            "finished" &&
          statusB ===
            "finished"
        ) {
          return (
            dateB - dateA
          );
        }

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
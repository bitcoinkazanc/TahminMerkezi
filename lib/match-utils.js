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
   * KESİN BİTMİŞ
   * --------------------------------------------------
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
     * Penaltı atışları devam ediyorsa
     * maç canlı kalır.
     */

    if (
      substate === "penalties" ||
      substate === "penalty" ||
      statusBox === "pen"
    ) {
      return "live";
    }

    /*
     * Mackolik bazen eski maçlarda
     * state=live bırakabiliyor.
     *
     * Maç başlangıcından 4 saatten fazla
     * geçmiş ve skor mevcutsa artık
     * canlı kabul etmiyoruz.
     */

    const matchDate =
      new Date(
        match?.match_date
      ).getTime();

    const homeScore =
      Number(
        match?.home_score
      );

    const awayScore =
      Number(
        match?.away_score
      );

    const hasScore =
      Number.isFinite(
        homeScore
      ) &&
      Number.isFinite(
        awayScore
      );

    if (
      Number.isFinite(
        matchDate
      ) &&
      matchDate <
        Date.now() &&
      hasScore
    ) {
      const elapsed =
        Date.now() -
        matchDate;

      if (
        elapsed >
        4 *
          60 *
          60 *
          1000
      ) {
        return "finished";
      }
    }

    return "live";
  }

  /*
   * --------------------------------------------------
   * YAKLAŞAN
   * --------------------------------------------------
   */

  return "scheduled";
}


/*
 * --------------------------------------------------
 * LİG ÖNCELİĞİ
 * --------------------------------------------------
 */

export function getLeaguePriority(
  match
) {
  const league =
    String(
      match?.league || ""
    )
      .toLowerCase()
      .trim();

  /*
   * Türkiye
   */

  if (
    league.includes(
      "super lig"
    ) ||
    league.includes(
      "süper lig"
    ) ||
    league.includes(
      "super league"
    ) ||
    league.includes(
      "türkiye süper"
    ) ||
    league.includes(
      "turkish super"
    )
  ) {
    return 1;
  }

  if (
    league.includes(
      "1. lig"
    ) ||
    league.includes(
      "1 lig"
    ) ||
    league.includes(
      "tff 1"
    ) ||
    league.includes(
      "turkish first"
    )
  ) {
    return 2;
  }

  if (
    league.includes(
      "2. lig"
    ) ||
    league.includes(
      "2 lig"
    ) ||
    league.includes(
      "tff 2"
    ) ||
    league.includes(
      "turkish second"
    )
  ) {
    return 3;
  }

  if (
    league.includes(
      "3. lig"
    ) ||
    league.includes(
      "3 lig"
    ) ||
    league.includes(
      "tff 3"
    ) ||
    league.includes(
      "turkish third"
    )
  ) {
    return 4;
  }

  /*
   * Büyük Avrupa ligleri
   */

  if (
    league.includes(
      "premier league"
    ) ||
    league.includes(
      "ingiltere premier"
    )
  ) {
    return 10;
  }

  if (
    league.includes(
      "la liga"
    ) ||
    league.includes(
      "ispanya"
    )
  ) {
    return 11;
  }

  if (
    league.includes(
      "serie a"
    ) ||
    league.includes(
      "italya"
    )
  ) {
    return 12;
  }

  if (
    league.includes(
      "bundesliga"
    ) ||
    league.includes(
      "almanya"
    )
  ) {
    return 13;
  }

  if (
    league.includes(
      "ligue 1"
    ) ||
    league.includes(
      "fransa"
    )
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
 * DURUM ÖNCELİĞİ LİGDEN ÖNCE GELİR.
 *
 * 1. Canlı
 * 2. Yaklaşan
 * 3. Ertelenen
 * 4. İptal
 * 5. Biten
 * --------------------------------------------------
 */

export function sortMatches(
  matches = []
) {
  if (
    !Array.isArray(
      matches
    )
  ) {
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
       * ------------------------------------------------
       * 1. ÖNCE MAÇ DURUMU
       * ------------------------------------------------
       *
       * Böylece hangi lig olursa olsun
       * bitmiş maç asla canlı/yaklaşan
       * maçın önüne geçemez.
       */

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
          priorityA -
          priorityB
        );
      }

      /*
       * ------------------------------------------------
       * 2. AYNI DURUMDA LİG ÖNCELİĞİ
       * ------------------------------------------------
       */

      const leagueA =
        getLeaguePriority(a);

      const leagueB =
        getLeaguePriority(b);

      if (
        leagueA !==
        leagueB
      ) {
        return (
          leagueA -
          leagueB
        );
      }

      /*
       * ------------------------------------------------
       * 3. CANLI MAÇLAR
       * ------------------------------------------------
       *
       * Dakikası büyük olan üstte.
       *
       * 78'
       * 65'
       * 42'
       * 12'
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
       * ------------------------------------------------
       * 4. TARİH / SAAT
       * ------------------------------------------------
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
         * BİTENLER:
         *
         * En son biten maç üstte.
         */

        if (
          statusA ===
            "finished" &&
          statusB ===
            "finished"
        ) {
          return (
            dateB -
            dateA
          );
        }

        /*
         * YAKLAŞANLAR:
         *
         * En yakın maç üstte.
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
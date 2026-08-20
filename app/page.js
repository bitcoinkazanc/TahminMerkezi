"use client";

import { useEffect, useState } from "react";
import MatchList from "../components/MatchList";
import Loading from "../components/Loading";

export default function HomePage() {
  const [matches, setMatches] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    async function initializeApp() {
      try {
        await authenticateTelegram();
      } catch (error) {
        console.error(
          "Telegram authentication error:",
          error
        );

        setAuthError(
          error?.message ||
            "Telegram doğrulaması başarısız oldu."
        );
      }

      try {
        const response = await fetch(
          "/api/matches?limit=50",
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (response.ok && result.success) {
          setMatches(result.matches || []);
        }
      } catch (error) {
        console.error(
          "Matches loading error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    initializeApp();
  }, []);

  async function authenticateTelegram() {
    if (typeof window === "undefined") {
      return;
    }

    const telegram = window.Telegram?.WebApp;

    if (!telegram) {
      throw new Error(
        "Telegram WebApp bulunamadı. Uygulama Telegram üzerinden açılmamış olabilir."
      );
    }

    telegram.ready();
    telegram.expand();

    const initData = telegram.initData;

    if (!initData) {
      throw new Error(
        "Telegram initData bulunamadı."
      );
    }

    const response = await fetch(
      "/api/telegram/auth",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initData,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ||
          "Telegram doğrulaması başarısız."
      );
    }

    if (result.user) {
      setUser(result.user);

      localStorage.setItem(
        "tm_user",
        JSON.stringify(result.user)
      );
    }
  }

  if (authError) {
    return (
      <main className="page">
        <div className="page-container">
          <div className="empty-state">
            <div className="empty-icon">
              ⚠️
            </div>

            <h1>Telegram Giriş Hatası</h1>

            <p>{authError}</p>

            <button
              type="button"
              className="primary-button"
              onClick={() => {
                window.location.reload();
              }}
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </main>
    );
  }

  const leaguePriority = [
    "Turkish Super League",
    "Turkish First League",
    "Turkish Second League",
    "Turkish Third League",
    "English Premier League",
    "Spanish La Liga",
    "Italian Serie A",
    "Bundesliga",
    "French Ligue 1",
    "Netherlands Eredivisie",
    "Portuguese Primeira Liga",
    "Belgian Pro League",
  ];

  const sortedMatches = [...matches].sort(
    (a, b) => {
      const leagueA = (
        a?.league || ""
      ).toLowerCase();

      const leagueB = (
        b?.league || ""
      ).toLowerCase();

      const indexA =
        leaguePriority.findIndex((league) =>
          leagueA.includes(
            league.toLowerCase()
          )
        );

      const indexB =
        leaguePriority.findIndex((league) =>
          leagueB.includes(
            league.toLowerCase()
          )
        );

      const priorityA =
        indexA === -1
          ? leaguePriority.length
          : indexA;

      const priorityB =
        indexB === -1
          ? leaguePriority.length
          : indexB;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return (
        new Date(a.match_date) -
        new Date(b.match_date)
      );
    }
  );

  const visibleMatches =
    sortedMatches.slice(
      0,
      visibleCount
    );

  const hasMoreMatches =
    visibleCount <
    sortedMatches.length;

  return (
    <main className="page">
      <div className="page-container">

        <section className="section-card">

          <div className="section-title home-matches-title">
            <h2>Maçlar</h2>
          </div>

          {loading ? (
            <Loading />
          ) : sortedMatches.length === 0 ? (
            <div className="empty-state small">

              <div className="empty-icon">
                ⚽
              </div>

              <h3>
                Henüz maç yok
              </h3>

              <p>
                Maçlar sisteme eklendiğinde
                burada görünecek.
              </p>

            </div>
          ) : (
            <>
              <MatchList
                matches={visibleMatches}
              />

              {hasMoreMatches ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "16px",
                  }}
                >
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() =>
                      setVisibleCount(
                        (current) =>
                          current + 10
                      )
                    }
                  >
                    Daha Fazla Maç
                  </button>
                </div>
              ) : null}

              <div className="home-disclaimer">
                <strong>
                  ❗ Sorumluluk Reddi:
                </strong>{" "}
                Tahminler yalnızca eğlence ve
                bilgi amaçlıdır. Gerçek para ile
                bahis veya kazanç garantisi içermez.
              </div>
            </>
          )}

        </section>

      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MatchList from "../components/MatchList";
import Loading from "../components/Loading";

export default function HomePage() {
  const [matches, setMatches] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

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
          "/api/matches?limit=10",
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
            <div className="empty-icon">⚠️</div>

            <h1>Telegram Giriş Hatası</h1>

            <p>{authError}</p>

            <Link
              href="/"
              className="primary-button"
            >
              Tekrar Dene
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const displayName =
    user?.first_name ||
    user?.username ||
    "TahminMerkezi";

  return (
    <main className="page">
      <div className="page-container">
        <section className="home-hero">
          <span className="page-eyebrow">
            TAHMİNMERCİZİ
          </span>

          <h1>
            Hoş geldin
            {displayName !== "TahminMerkezi"
              ? `, ${displayName}`
              : ""}
            !
          </h1>

          <p>
            Maçları incele, tahminini yap ve
            topluluğun görüşlerine katıl.
          </p>
        </section>

        <div className="home-actions">
          <Link
            href="/maclar"
            className="primary-button"
          >
            ⚽ Maçları Gör
          </Link>

          <Link
            href="/profil"
            className="secondary-button"
          >
            👤 Profilim
          </Link>
        </div>

        <section className="section-card">
          <div className="section-title">
            <h2>Yaklaşan Maçlar</h2>

            <p>
              Yaklaşan karşılaşmalar ve topluluk
              tahminleri.
            </p>
          </div>

          {loading ? (
            <Loading />
          ) : matches.length === 0 ? (
            <div className="empty-state small">
              <div className="empty-icon">
                ⚽
              </div>

              <h3>Henüz maç yok</h3>

              <p>
                Maçlar sisteme eklendiğinde burada
                görünecek.
              </p>

              <Link
                href="/maclar"
                className="primary-button"
              >
                Tüm Maçlar
              </Link>
            </div>
          ) : (
            <>
              <MatchList matches={matches} />

              <Link
                href="/maclar"
                className="home-all-matches"
              >
                Tüm Maçları Gör →
              </Link>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MatchList from "../../components/MatchList";
import Loading from "../../components/Loading";
import { sortMatches } from "../../lib/match-utils";

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMatches() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/matches?limit=100",
        {
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Maçlar alınamadı."
        );
      }

      const sortedMatches =
        sortMatches(
          Array.isArray(
            result.matches
          )
            ? result.matches
            : []
        );

      setMatches(
        sortedMatches
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Maçlar yüklenirken bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, []);

  return (
    <main className="page">
      <div className="page-container">

        {/* MAÇLAR SAYFASI ÜST KUTUSU */}
        <section
          className="home-hero"
          style={{
            position: "relative",
          }}
        >
          {/* YENİLEME BUTONU */}
          <button
            type="button"
            className="refresh-button"
            onClick={loadMatches}
            disabled={loading}
            aria-label="Maçları yenile"
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
            }}
          >
            ↻
          </button>

          {/* BAŞLIK */}
          <div className="home-hero-title">
            <span className="home-hero-decoration">
              ✦
            </span>

            <h1>
              Günün maçları seni bekliyor
            </h1>

            <span className="home-hero-decoration">
              ✦
            </span>
          </div>

          {/* SLOGAN */}
          <p
            className="home-hero-text"
            style={{
              marginBottom: "10px",
            }}
          >
            Başarı oranın ne kadar yüksekse,
            sesin o kadar gür çıkar
          </p>

          {/* TAHMİN TEŞVİK METNİ */}
          <p
            className="home-hero-text"
            style={{
              marginTop: "0",
            }}
          >
            Maçı seç, analizini yap ve tahminini
            paylaş. Doğru tahminlerinle puanını
            yükselt, liderlik kürsüsüne yaklaş! 🏆
          </p>
        </section>

        {/* MAÇLAR */}
        <section className="section-card">
          {loading ? (
            <Loading />
          ) : error ? (
            <div className="error-box">
              <h2>
                Maçlar yüklenemedi
              </h2>

              <p>
                {error}
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={loadMatches}
              >
                Tekrar Dene
              </button>
            </div>
          ) : matches.length === 0 ? (
            <div className="empty-state small">
              <div className="empty-icon">
                ⚽
              </div>

              <h3>
                Henüz maç yok
              </h3>

              <p>
                Maçlar sisteme
                eklendiğinde burada
                görünecek.
              </p>

              <Link
                href="/"
                className="primary-button"
              >
                Ana Sayfaya Dön
              </Link>
            </div>
          ) : (
            <>
              <MatchList
                matches={matches}
              />

              <div className="home-disclaimer">
                <strong>
                  ❗ Sorumluluk Reddi:
                </strong>{" "}
                Tahminler yalnızca eğlence ve bilgi
                amaçlıdır. Gerçek para ile bahis veya
                kazanç garantisi içermez.
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
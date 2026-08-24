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

      /*
       * ÖNEMLİ:
       *
       * Burada artık sayfanın kendi
       * sortMatches() fonksiyonunu
       * kullanmıyoruz.
       *
       * lib/match-utils.js içindeki
       * ortak sıralama kullanılıyor.
       *
       * Böylece MatchCard'da "Bitti"
       * olarak görünen maç aynı şekilde
       * sıralamada da BİTMİŞ kabul edilir.
       */

      const sortedMatches =
        sortMatches(
          result.matches || []
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
        <div className="page-header">
          <div>
            <span className="page-eyebrow">
              TAHMİNMERCİZİ
            </span>

            <h1>
              🏆 Bugünün Maçları
            </h1>

            <p>
              Maçı seç, tahminini yap,
              puanını topla!
            </p>

            <p>
              Favori maçını seç, tahminini
              paylaş ve doğru tahminlerle
              puanını yükselt. Zirve seni
              bekliyor! 🔥
            </p>
          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={loadMatches}
            disabled={loading}
            aria-label="Maçları yenile"
          >
            ↻
          </button>
        </div>

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
          <div className="empty-state">
            <div className="empty-icon">
              ⚽
            </div>

            <h2>
              Henüz maç yok
            </h2>

            <p>
              Sisteme maçlar
              eklendiğinde burada
              görüntülenecek.
            </p>

            <Link
              href="/"
              className="primary-button"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        ) : (
          <MatchList
            matches={matches}
          />
        )}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MatchList from "../../components/MatchList";
import Loading from "../../components/Loading";
import { sortMatches } from "../../lib/match-utils";

const INITIAL_VISIBLE_COUNT = 20;
const LOAD_MORE_COUNT = 10;

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [visibleCount, setVisibleCount] =
    useState(INITIAL_VISIBLE_COUNT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMatches() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/matches",
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

      const loadedMatches =
        Array.isArray(
          result.matches
        )
          ? result.matches
          : [];

      /*
       * Ana sayfa ile aynı sıralama
       * sistemini kullan.
       */
      setMatches(
        sortMatches(
          loadedMatches
        )
      );

      setVisibleCount(
        INITIAL_VISIBLE_COUNT
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Maçlar yüklenirken bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, []);

  const visibleMatches =
    matches.slice(
      0,
      visibleCount
    );

  const hasMore =
    visibleCount <
    matches.length;

  function loadMore() {
    setVisibleCount(
      (current) =>
        Math.min(
          current +
            LOAD_MORE_COUNT,
          matches.length
        )
    );
  }

  return (
    <main className="page">
      <div className="page-container">
        <div className="page-header">
          <div>
            <span className="page-eyebrow">
              TAHMİNMERCİZİ
            </span>

            <h1>
              Maçlar
            </h1>

            <p>
              Bugünün ve yaklaşan
              maçlarını keşfet.
            </p>
          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={
              loadMatches
            }
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
              onClick={
                loadMatches
              }
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
              Maçkolik'ten maç
              geldiğinde burada
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
          <>
            <MatchList
              matches={
                visibleMatches
              }
            />

            {hasMore && (
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "center",
                  marginTop:
                    "20px",
                  marginBottom:
                    "20px",
                }}
              >
                <button
                  type="button"
                  className="primary-button"
                  onClick={
                    loadMore
                  }
                >
                  Daha Fazla
                </button>
              </div>
            )}

            {!hasMore &&
              matches.length >
                INITIAL_VISIBLE_COUNT && (
                <div
                  style={{
                    textAlign:
                      "center",
                    marginTop:
                      "20px",
                    marginBottom:
                      "20px",
                    opacity: 0.7,
                  }}
                >
                  Tüm maçlar
                  gösteriliyor.
                </div>
              )}
          </>
        )}
      </div>
    </main>
  );
}
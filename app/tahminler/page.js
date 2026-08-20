"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Loading from "../../components/Loading";
import PredictionMessage from "../../components/PredictionMessage";

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPredictions();
  }, []);

  async function loadPredictions() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/predictions",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Tahminler alınamadı."
        );
      }

      setPredictions(result.predictions || []);
    } catch (err) {
      console.error(
        "Predictions page error:",
        err
      );

      setError(
        err.message ||
          "Tahminler yüklenirken bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <div className="page-container">
          <Loading />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <div className="page-container">
          <div className="error-box">
            <h2>Bir sorun oluştu</h2>

            <p>{error}</p>

            <button
              type="button"
              className="primary-button"
              onClick={loadPredictions}
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-container">
        <section className="section-card">
          <div className="section-title">
            <h1>🎯 Tahminler</h1>

            <p>
              Topluluğun yaptığı son
              tahminleri keşfet.
            </p>
          </div>

          {predictions.length === 0 ? (
            <div className="empty-state small">
              <div className="empty-icon">
                🎯
              </div>

              <h3>
                Henüz tahmin yok
              </h3>

              <p>
                İlk tahmini sen yapabilirsin.
              </p>

              <Link
                href="/"
                className="primary-button"
              >
                Maçlara Git
              </Link>
            </div>
          ) : (
            <div className="prediction-list">
              {predictions.map((prediction) => {
                const match =
                  prediction?.matches;

                const user =
                  prediction?.users;

                if (!match) {
                  return null;
                }

                return (
                  <div
                    key={prediction.id}
                    className="prediction-feed-item"
                  >
                    <PredictionMessage
                      prediction={prediction}
                    />

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginTop: "8px",
                      }}
                    >
                      {user?.id ? (
                        <Link
                          href={`/profile?user_id=${encodeURIComponent(
                            user.id
                          )}`}
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: "34px",
                            padding: "7px 10px",
                            border: "1px solid var(--border)",
                            borderRadius: "9px",
                            background:
                              "var(--surface-soft)",
                            color: "var(--text)",
                            fontSize: "11px",
                            fontWeight: 800,
                            textDecoration: "none",
                          }}
                        >
                          👤 Profile Git
                        </Link>
                      ) : null}

                      <Link
                        href={`/mac/${match.id}`}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: "34px",
                          padding: "7px 10px",
                          border: "1px solid var(--primary)",
                          borderRadius: "9px",
                          background:
                            "var(--primary)",
                          color: "#fff",
                          fontSize: "11px",
                          fontWeight: 800,
                          textDecoration: "none",
                        }}
                      >
                        ⚽ Maça Git
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
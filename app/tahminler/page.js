"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Loading from "../../components/Loading";

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

  function getUsername(prediction) {
    const user = prediction?.users;

    if (user?.username) {
      return `@${user.username}`;
    }

    if (user?.first_name) {
      return user.first_name;
    }

    return "Telegram Kullanıcısı";
  }

  function getAvatarLetter(prediction) {
    const user = prediction?.users;

    return (
      user?.username ||
      user?.first_name ||
      "T"
    )
      .charAt(0)
      .toUpperCase();
  }

  function getPredictionLabel(value) {
    const labels = {
      MS1: "MS 1",
      MSX: "MS X",
      MS2: "MS 2",
    };

    return labels[value] || value;
  }

  function formatDate(value) {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return {
      date: date.toLocaleDateString(
        "tr-TR",
        {
          day: "2-digit",
          month: "short",
        }
      ),
      time: date.toLocaleTimeString(
        "tr-TR",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
    };
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
            <div className="prediction-feed">
              {predictions.map((prediction) => {
                const match =
                  prediction?.matches;

                if (!match) {
                  return null;
                }

                const user =
                  prediction?.users;

                const username =
                  getUsername(prediction);

                const avatarLetter =
                  getAvatarLetter(prediction);

                const formattedDate =
                  formatDate(
                    prediction.created_at
                  );

                return (
                  <Link
                    key={prediction.id}
                    href={`/mac/${match.id}`}
                    className="prediction-message-link"
                  >
                    <article className="prediction-message">
                      <div className="prediction-match-info">
                        <span>
                          {match.home_team}
                        </span>

                        <strong>—</strong>

                        <span>
                          {match.away_team}
                        </span>
                      </div>

                      <div className="prediction-message-main">
                        <div className="prediction-message-avatar">
                          {user?.avatar_url ? (
                            <img
                              src={
                                user.avatar_url
                              }
                              alt={username}
                              className="user-avatar"
                            />
                          ) : (
                            <div className="user-avatar-placeholder">
                              {avatarLetter}
                            </div>
                          )}
                        </div>

                        <div className="prediction-message-content">
                          <div className="prediction-message-top">
                            <strong>
                              {username}
                            </strong>
                          </div>

                          <div className="prediction-message-result">
                            <span className="prediction-badge">
                              {getPredictionLabel(
                                prediction.prediction
                              )}
                            </span>

                            {prediction.confidence !=
                            null ? (
                              <span className="prediction-confidence-value">
                                Güven %
                                {
                                  prediction.confidence
                                }
                              </span>
                            ) : null}
                          </div>

                          {prediction.message ? (
                            <p className="prediction-message-text">
                              {prediction.message}
                            </p>
                          ) : null}

                          {formattedDate ? (
                            <div className="prediction-message-date">
                              {
                                formattedDate.date
                              }{" "}
                              ·{" "}
                              {
                                formattedDate.time
                              }
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
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

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Tahminler alınamadı."
        );
      }

      setPredictions(
        result.predictions || []
      );
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

  function getUserName(prediction) {
    const user =
      prediction?.users;

    if (user?.first_name) {
      return user.first_name;
    }

    if (user?.username) {
      return `@${user.username}`;
    }

    return "Kullanıcı";
  }

  function getPredictionLabel(value) {
    const labels = {
      MS1: "MS 1",
      MSX: "MS X",
      MS2: "MS 2",
    };

    return labels[value] || value;
  }

  function getPredictionDescription(value) {
    const descriptions = {
      MS1: "Ev sahibi kazanır",
      MSX: "Beraberlik",
      MS2: "Deplasman kazanır",
    };

    return descriptions[value] || "";
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString(
      "tr-TR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
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
            <h2>
              Bir sorun oluştu
            </h2>

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
            <h1>
              🎯 Tahminler
            </h1>

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
              {predictions.map(
                (item) => {
                  const userName =
                    getUserName(item);

                  const match =
                    item?.matches;

                  if (!match) {
                    return null;
                  }

                  return (
                    <Link
                      key={item.id}
                      href={`/mac/${match.id}`}
                      className="prediction-feed-card"
                    >
                      <div className="prediction-feed-user">
                        {item?.users
                          ?.avatar_url ? (
                          <img
                            src={
                              item.users
                                .avatar_url
                            }
                            alt={
                              userName
                            }
                            className="prediction-feed-avatar"
                          />
                        ) : (
                          <div className="prediction-feed-avatar-placeholder">
                            👤
                          </div>
                        )}

                        <div>
                          <strong>
                            {userName}
                          </strong>

                          <span>
                            {formatDate(
                              item.created_at
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="prediction-feed-match">
                        <div className="prediction-feed-league">
                          {match.league ||
                            "Futbol"}
                        </div>

                        <div className="prediction-feed-teams">
                          <span>
                            {match.home_team}
                          </span>

                          <strong>
                            VS
                          </strong>

                          <span>
                            {match.away_team}
                          </span>
                        </div>
                      </div>

                      <div className="prediction-feed-result">
                        <div>
                          <strong>
                            {getPredictionLabel(
                              item.prediction
                            )}
                          </strong>

                          <span>
                            {getPredictionDescription(
                              item.prediction
                            )}
                          </span>
                        </div>

                        {item.confidence !==
                        null ? (
                          <div className="prediction-feed-confidence">
                            %{item.confidence}
                          </div>
                        ) : null}
                      </div>

                      {item.message ? (
                        <div className="prediction-feed-message">
                          “{item.message}”
                        </div>
                      ) : null}

                      <div className="prediction-feed-footer">
                        <span>
                          Maça git
                        </span>

                        <strong>
                          →
                        </strong>
                      </div>
                    </Link>
                  );
                }
              )}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
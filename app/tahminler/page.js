"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Loading from "../../components/Loading";
import PredictionMessage from "../../components/PredictionMessage";

export default function PredictionsPage() {
  const [predictions, setPredictions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadPredictions();
  }, []);

  async function loadPredictions() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
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
              onClick={
                loadPredictions
              }
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
      <div
        className="page-container"
        style={{
          paddingTop: "4px",
        }}
      >
        <section
          className="section-card"
          style={{
            paddingTop: "6px",
          }}
        >
          <div
            className="section-title"
            style={{
              marginTop: 0,
              marginBottom: "8px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "10px",
                lineHeight: 1.2,
                color: "var(--muted)",
              }}
            >
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
                İlk tahmini sen
                yapabilirsin.
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
              {predictions.map(
                (prediction) => {
                  const match =
                    prediction?.matches;

                  if (!match) {
                    return null;
                  }

                  return (
                    <div
                      key={
                        prediction.id
                      }
                      className="prediction-feed-item"
                    >
                      <PredictionMessage
                        prediction={
                          prediction
                        }
                      />
                    </div>
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
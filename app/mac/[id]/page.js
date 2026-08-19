"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PredictionBox from "../../../components/PredictionBox";
import PredictionMessage from "../../../components/PredictionMessage";
import ChatBox from "../../../components/ChatBox";
import Loading from "../../../components/Loading";

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params?.id;

  const [match, setMatch] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMatch() {
    if (!matchId) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/matches?id=${encodeURIComponent(matchId)}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Maç bilgileri alınamadı."
        );
      }

      const foundMatch = result.matches?.[0];

      if (!foundMatch) {
        throw new Error("Maç bulunamadı.");
      }

      setMatch(foundMatch);
    } catch (err) {
      console.error(err);

      setError(
        err.message || "Maç yüklenirken hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPredictions() {
    if (!matchId) return;

    try {
      const response = await fetch(
        `/api/predictions?match_id=${encodeURIComponent(
          matchId
        )}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        return;
      }

      setPredictions(result.predictions || []);
    } catch (err) {
      console.error(
        "Predictions loading error:",
        err
      );
    }
  }

  useEffect(() => {
    loadMatch();
    loadPredictions();
  }, [matchId]);

  function handlePredictionCreated(newPrediction) {
    if (!newPrediction) return;

    setPredictions((current) => {
      const exists = current.some(
        (item) => item.id === newPrediction.id
      );

      if (exists) {
        return current;
      }

      return [newPrediction, ...current];
    });
  }

  if (loading) {
    return <Loading />;
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
              onClick={() => {
                loadMatch();
                loadPredictions();
              }}
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!match) {
    return (
      <main className="page">
        <div className="page-container">
          <div className="empty-state">
            <h2>Maç bulunamadı</h2>

            <p>
              Aradığınız maç artık mevcut değil.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const matchDate = new Date(match.match_date);

  const formattedDate =
    matchDate.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const formattedTime =
    matchDate.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <main className="page">
      <div className="page-container">
        <section className="match-detail-card">
          <div className="match-detail-league">
            {match.league_logo ? (
              <img
                src={match.league_logo}
                alt=""
                className="league-logo"
              />
            ) : null}

            <span>
              {match.league || "Futbol"}
            </span>
          </div>

          <div className="match-detail-date">
            {formattedDate} • {formattedTime}
          </div>

          <div className="teams-detail">
            <div className="team-detail">
              {match.home_logo ? (
                <img
                  src={match.home_logo}
                  alt={match.home_team}
                  className="team-logo-large"
                />
              ) : (
                <div className="team-logo-placeholder">
                  ⚽
                </div>
              )}

              <strong>{match.home_team}</strong>
            </div>

            <div className="match-vs">
              <span>VS</span>
            </div>

            <div className="team-detail">
              {match.away_logo ? (
                <img
                  src={match.away_logo}
                  alt={match.away_team}
                  className="team-logo-large"
                />
              ) : (
                <div className="team-logo-placeholder">
                  ⚽
                </div>
              )}

              <strong>{match.away_team}</strong>
            </div>
          </div>

          <div className="match-status">
            {match.status === "live"
              ? "🔴 Canlı"
              : match.status === "finished"
                ? "🏁 Tamamlandı"
                : match.status === "postponed"
                  ? "⏸ Ertelendi"
                  : match.status === "cancelled"
                    ? "❌ İptal"
                    : "🕐 Yaklaşan Maç"}
          </div>
        </section>

        <section className="section-card">
          <div className="section-title">
            <h2>Tahminini Yap</h2>

            <p>
              Bu maç için tahminini seç ve
              toplulukla paylaş.
            </p>
          </div>

          <PredictionBox
            match={match}
            onPredictionCreated={
              handlePredictionCreated
            }
          />
        </section>

        <section className="section-card">
          <div className="section-title">
            <h2>Tahminler</h2>

            <p>
              Bu maç için yapılan topluluk
              tahminleri.
            </p>
          </div>

          {predictions.length === 0 ? (
            <div className="empty-state small">
              <p>
                Henüz bu maç için tahmin
                yapılmamış.
              </p>

              <span>
                İlk tahmini sen yapabilirsin.
              </span>
            </div>
          ) : (
            <div className="prediction-list">
              {predictions.map((prediction) => (
                <PredictionMessage
                  key={prediction.id}
                  prediction={prediction}
                />
              ))}
            </div>
          )}
        </section>

        <section className="section-card">
          <div className="section-title">
            <h2>Maç Sohbeti</h2>

            <p>
              Bu maç hakkında toplulukla konuş.
            </p>
          </div>

          <ChatBox matchId={match.id} />
        </section>
      </div>
    </main>
  );
}
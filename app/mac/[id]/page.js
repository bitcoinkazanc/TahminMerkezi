"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

  async function loadMatch(showLoading = true) {
    if (!matchId) return;

    try {
      if (showLoading) {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        `/api/matches?id=${encodeURIComponent(
          matchId
        )}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Maç bilgileri alınamadı."
        );
      }

      const foundMatch =
        result.matches?.[0];

      if (!foundMatch) {
        throw new Error(
          "Maç bulunamadı."
        );
      }

      setMatch(foundMatch);
    } catch (err) {
      console.error(err);

      if (showLoading) {
        setError(
          err.message ||
            "Maç yüklenirken hata oluştu."
        );
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
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

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        return;
      }

      setPredictions(
        result.predictions || []
      );
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

  useEffect(() => {
    if (!matchId) return;

    const interval = setInterval(() => {
      loadMatch(false);
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [matchId]);

  function handlePredictionCreated(
    newPrediction
  ) {
    if (!newPrediction) return;

    setPredictions((current) => {
      const exists = current.some(
        (item) =>
          item.id === newPrediction.id
      );

      if (exists) {
        return current;
      }

      return [
        newPrediction,
        ...current,
      ];
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
            <h2>
              Bir sorun oluştu
            </h2>

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
            <h2>
              Maç bulunamadı
            </h2>

            <p>
              Aradığınız maç artık
              mevcut değil.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const matchDate =
    new Date(match.match_date);

  const formattedDate =
    matchDate.toLocaleDateString(
      "tr-TR",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

  const formattedTime =
    matchDate.toLocaleTimeString(
      "tr-TR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  const isLive =
    match.status === "live";

  const isFinished =
    match.status === "finished";

  const hasScore =
    isLive || isFinished;

  const homeScore =
    match.home_score !== null &&
    match.home_score !== undefined
      ? match.home_score
      : 0;

  const awayScore =
    match.away_score !== null &&
    match.away_score !== undefined
      ? match.away_score
      : 0;

  const liveMinute =
    match.live_minute !== null &&
    match.live_minute !== undefined &&
    match.live_minute !== ""
      ? match.live_minute
      : null;

  return (
    <main className="page">
      <div className="page-container">

        <section
          className="match-detail-card"
          style={{
            textAlign: "center",
            padding: "20px 14px",
          }}
        >

          <div className="match-detail-league">
            {match.league_logo ? (
              <img
                src={match.league_logo}
                alt=""
                className="league-logo"
              />
            ) : null}

            <span>
              {match.league ||
                "Futbol"}
            </span>
          </div>

          <div
            className="match-detail-date"
            style={{
              marginTop: "8px",
            }}
          >
            {formattedDate} •{" "}
            {formattedTime}
          </div>

          <div
            className="match-status"
            style={{
              display: "inline-block",
              marginTop: "14px",
              marginBottom: "20px",
            }}
          >
            {isLive
              ? liveMinute !== null
                ? `🔴 CANLI • ${liveMinute}'`
                : "🔴 CANLI"
              : isFinished
                ? "🏁 MAÇ BİTTİ"
                : match.status ===
                    "postponed"
                  ? "⏸ ERTELENDİ"
                  : match.status ===
                      "cancelled"
                    ? "❌ İPTAL"
                    : "🕐 YAKLAŞIYOR"}
          </div>

          <div
            className="teams-detail"
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 100px 1fr",
              alignItems: "center",
              gap: "10px",
            }}
          >

            <div
              className="team-detail"
              style={{
                textAlign: "center",
              }}
            >
              {match.home_logo ? (
                <img
                  src={match.home_logo}
                  alt={
                    match.home_team
                  }
                  className="team-logo-large"
                />
              ) : (
                <div className="team-logo-placeholder">
                  ⚽
                </div>
              )}

              <strong>
                {match.home_team}
              </strong>
            </div>

            <div
              className="match-vs"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                minHeight: "70px",
              }}
            >
              {hasScore ? (
                <span
                  style={{
                    fontSize: "36px",
                    fontWeight: "900",
                    letterSpacing:
                      "2px",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {homeScore} -{" "}
                  {awayScore}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: "800",
                    color: "#9ca3af",
                  }}
                >
                  VS
                </span>
              )}
            </div>

            <div
              className="team-detail"
              style={{
                textAlign: "center",
              }}
            >
              {match.away_logo ? (
                <img
                  src={match.away_logo}
                  alt={
                    match.away_team
                  }
                  className="team-logo-large"
                />
              ) : (
                <div className="team-logo-placeholder">
                  ⚽
                </div>
              )}

              <strong>
                {match.away_team}
              </strong>
            </div>

          </div>

          {isLive ? (
            <div
              style={{
                marginTop: "16px",
                fontSize: "12px",
                color: "#dc2626",
                fontWeight: "700",
              }}
            >
              🔄 Canlı skor otomatik
              olarak güncelleniyor
            </div>
          ) : null}

        </section>

        <section className="section-card">
          <div className="section-title">
            <h2>
              Tahminini Yap
            </h2>

            <p>
              Bu maç için tahminini
              seç ve toplulukla paylaş.
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
            <h2>
              Tahminler
            </h2>

            <p>
              Bu maç için yapılan
              topluluk tahminleri.
            </p>
          </div>

          {predictions.length ===
          0 ? (
            <div className="empty-state small">
              <p>
                Henüz bu maç için
                tahmin yapılmamış.
              </p>

              <span>
                İlk tahmini sen
                yapabilirsin.
              </span>
            </div>
          ) : (
            <div className="prediction-list">
              {predictions.map(
                (prediction) => (
                  <PredictionMessage
                    key={
                      prediction.id
                    }
                    prediction={
                      prediction
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        <section className="section-card">
          <div className="section-title">
            <h2>
              Maç Sohbeti
            </h2>

            <p>
              Bu maç hakkında
              toplulukla konuş.
            </p>
          </div>

          <ChatBox
            matchId={match.id}
          />
        </section>

      </div>
    </main>
  );
}
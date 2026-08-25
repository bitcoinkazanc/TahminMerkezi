"use client";

import Link from "next/link";
import { getMatchStatus } from "../lib/match-utils";

export default function MatchCard({
  match,
}) {
  if (!match) {
    return null;
  }

  const currentStatus =
    getMatchStatus(match);

  const isLive =
    currentStatus === "live";

  const isFinished =
    currentStatus === "finished";

  const isScheduled =
    currentStatus === "scheduled";

  const canPredict =
    isLive ||
    isScheduled;

  const matchDate =
    match.match_date
      ? new Date(
          match.match_date
        )
      : null;

  const validDate =
    matchDate &&
    !Number.isNaN(
      matchDate.getTime()
    );

  const formattedDate =
    validDate
      ? matchDate.toLocaleDateString(
          "tr-TR",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }
        )
      : "";

  const formattedTime =
    validDate
      ? matchDate.toLocaleTimeString(
          "tr-TR",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        )
      : "";

  const statusLabels = {
    scheduled: "Yaklaşan",
    upcoming: "Yaklaşan",
    live: "CANLI",
    finished: "Bitti",
    postponed: "Ertelendi",
    cancelled: "İptal",
  };

  const statusLabel =
    statusLabels[
      currentStatus
    ] ||
    statusLabels[
      match.status
    ] ||
    "Yaklaşan";

  const hasScore =
    isLive ||
    isFinished;

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

  /*
   * ==================================================
   * SOSYAL SAYILAR
   * ==================================================
   *
   * Sayılar artık MatchCard tarafından API'den
   * çekilmiyor.
   *
   * /api/matches toplu olarak:
   *
   * prediction_count
   * comment_count
   *
   * alanlarını gönderdiğinde burada doğrudan
   * gösterilecek.
   *
   * Böylece her maç kartı için ekstra fetch
   * yapılmaz.
   */

  const predictionCount =
    Number(
      match.prediction_count ??
        match.predictionCount ??
        0
    ) || 0;

  const commentCount =
    Number(
      match.comment_count ??
        match.commentCount ??
        0
    ) || 0;

  const cardContent = (
    <>
      <div className="match-card-top">
        <div className="match-league">
          {match.league_logo ? (
            <img
              src={
                match.league_logo
              }
              alt=""
              className="league-logo"
              loading="lazy"
            />
          ) : null}

          <span>
            {match.league ||
              "Futbol"}
          </span>
        </div>

        <span
          className={`match-status ${
            isLive
              ? "live"
              : ""
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="match-teams">
        <div className="match-team">
          {match.home_logo ? (
            <img
              src={
                match.home_logo
              }
              alt={
                match.home_team
              }
              className="team-logo"
              loading="lazy"
            />
          ) : (
            <div className="team-logo-placeholder">
              ⚽
            </div>
          )}

          <span className="match-team-name">
            {match.home_team}
          </span>
        </div>

        <div className="match-vs-small">
          {hasScore ? (
            <strong>
              {homeScore} -{" "}
              {awayScore}
            </strong>
          ) : (
            "VS"
          )}
        </div>

        <div className="match-team away">
          <span className="match-team-name">
            {match.away_team}
          </span>

          {match.away_logo ? (
            <img
              src={
                match.away_logo
              }
              alt={
                match.away_team
              }
              className="team-logo"
              loading="lazy"
            />
          ) : (
            <div className="team-logo-placeholder">
              ⚽
            </div>
          )}
        </div>
      </div>

      <div
        className="match-card-bottom"
        style={{
          flexWrap: "wrap",
          rowGap: "5px",
        }}
      >
        <div className="match-date-time">
          <span>
            {formattedDate ||
              "Tarih belirtilmemiş"}
          </span>

          {formattedTime ? (
            <strong>
              {formattedTime}
            </strong>
          ) : null}
        </div>

        {canPredict ? (
          <span className="match-prediction-button">
            Tahmin Yap →
          </span>
        ) : (
          <span
            className="match-prediction-button"
            style={{
              opacity: 0.6,
              cursor: "default",
            }}
          >
            Biten maçlara tahmin
            yapılamaz
          </span>
        )}
      </div>

      {/*
       * ==================================================
       * TAHMİN / YORUM SAYILARI
       * ==================================================
       */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginTop: "5px",
          paddingTop: "5px",
          borderTop:
            "1px solid var(--border)",
          fontSize: "9px",
          fontWeight: 700,
          color: "var(--muted)",
        }}
      >
        <span>
          🎯 {predictionCount} Tahmin
        </span>

        <span
          style={{
            opacity: 0.45,
          }}
        >
          ·
        </span>

        <span>
          💬 {commentCount} Yorum
        </span>
      </div>
    </>
  );

  /*
   * ==================================================
   * CANLI / YAKLAŞAN MAÇ
   * ==================================================
   */

  if (canPredict) {
    return (
      <Link
        href={`/mac/${match.id}`}
        className="match-card"
      >
        {cardContent}
      </Link>
    );
  }

  /*
   * ==================================================
   * BİTEN / ERTELENEN / İPTAL MAÇ
   * ==================================================
   */

  return (
    <div className="match-card">
      {cardContent}
    </div>
  );
}
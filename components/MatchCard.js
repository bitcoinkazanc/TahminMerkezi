"use client";

import Link from "next/link";

export default function MatchCard({ match }) {
  if (!match) {
    return null;
  }

  const matchDate = match.match_date
    ? new Date(match.match_date)
    : null;

  const validDate =
    matchDate && !Number.isNaN(matchDate.getTime());

  const formattedDate = validDate
    ? matchDate.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const formattedTime = validDate
    ? matchDate.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const statusLabels = {
    scheduled: "Yaklaşan",
    live: "CANLI",
    finished: "Bitti",
    postponed: "Ertelendi",
    cancelled: "İptal",
  };

  const statusLabel =
    statusLabels[match.status] || match.status || "Yaklaşan";

  const isLive = match.status === "live";

  return (
    <Link
      href={`/mac/${match.id}`}
      className="match-card"
    >
      <div className="match-card-top">
        <div className="match-league">
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

        <span
          className={`match-status ${
            isLive ? "live" : ""
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="match-teams">
        <div className="match-team">
          {match.home_logo ? (
            <img
              src={match.home_logo}
              alt={match.home_team}
              className="team-logo"
            />
          ) : (
            <div className="team-logo-placeholder">
              ⚽
            </div>
          )}

          <span>{match.home_team}</span>
        </div>

        <div className="match-time">
          {formattedTime || "--:--"}
        </div>

        <div className="match-team">
          {match.away_logo ? (
            <img
              src={match.away_logo}
              alt={match.away_team}
              className="team-logo"
            />
          ) : (
            <div className="team-logo-placeholder">
              ⚽
            </div>
          )}

          <span>{match.away_team}</span>
        </div>
      </div>

      <div className="match-card-bottom">
        <span>
          {formattedDate || "Tarih belirtilmemiş"}
        </span>

        <span className="match-arrow">
          Tahmin Yap →
        </span>
      </div>
    </Link>
  );
}
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
    matchDate &&
    !Number.isNaN(matchDate.getTime());

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
    upcoming: "Yaklaşan",
    live: "CANLI",
    finished: "Bitti",
    postponed: "Ertelendi",
    cancelled: "İptal",
  };

  const statusLabel =
    statusLabels[match.status] ||
    match.status ||
    "Yaklaşan";

  const isLive =
    match.status === "live" ||
    match.state === "live";

  const isFinished =
    match.status === "finished" ||
    match.state === "post" ||
    match.substate === "fullTime";

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
    match.live_minute !== undefined
      ? match.live_minute
      : null;

  return (
    <Link
      href={`/mac/${encodeURIComponent(
        match.id
      )}`}
      className="match-card"
    >
      <div className="match-card-top">
        <div className="match-league">
          {match.league_logo ? (
            <img
              src={match.league_logo}
              alt=""
              className="league-logo"
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";
              }}
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
          {isLive
            ? "CANLI"
            : statusLabel}
        </span>
      </div>

      <div className="match-teams">
        <div className="match-team">
          {match.home_logo ? (
            <img
              src={match.home_logo}
              alt={match.home_team || ""}
              className="team-logo"
              width="48"
              height="48"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";
              }}
              style={{
                width: "48px",
                height: "48px",
                objectFit: "contain",
                display: "block",
              }}
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
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
              }}
            >
              <strong>
                {homeScore} - {awayScore}
              </strong>

              {isLive && liveMinute !== null ? (
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "800",
                    color: "#dc2626",
                    whiteSpace: "nowrap",
                  }}
                >
                  🔴 {liveMinute}'
                </span>
              ) : null}
            </div>
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
              src={match.away_logo}
              alt={match.away_team || ""}
              className="team-logo"
              width="48"
              height="48"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";
              }}
              style={{
                width: "48px",
                height: "48px",
                objectFit: "contain",
                display: "block",
              }}
            />
          ) : (
            <div className="team-logo-placeholder">
              ⚽
            </div>
          )}
        </div>
      </div>

      <div className="match-card-bottom">
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

        <span className="match-prediction-button">
          Tahmin Yap →
        </span>
      </div>
    </Link>
  );
}
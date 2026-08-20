"use client";

import Link from "next/link";

export default function PredictionMessage({
  prediction,
}) {
  if (!prediction) {
    return null;
  }

  const user = prediction.users;
  const match = prediction.matches;

  const username = user?.username
    ? `@${user.username}`
    : "Telegram Kullanıcısı";

  const avatarLetter = (
    user?.username ||
    user?.first_name ||
    "T"
  )
    .charAt(0)
    .toUpperCase();

  const predictionLabels = {
    MS1: "MS 1",
    MSX: "MS X",
    MS2: "MS 2",
  };

  const predictionLabel =
    predictionLabels[prediction.prediction] ||
    prediction.prediction;

  const date = prediction.created_at
    ? new Date(prediction.created_at)
    : null;

  const formattedDate =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "short",
        })
      : "";

  const formattedTime =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  const matchName = match
    ? `${match.home_team} - ${match.away_team}`
    : "Maç bilgisi yok";

  return (
    <article className="prediction-message">
      <div className="prediction-message-main">
        <div className="prediction-message-avatar">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={username}
              className="user-avatar"
            />
          ) : (
            <div className="user-avatar-placeholder">
              {avatarLetter}
            </div>
          )}
        </div>

        <div
          className="prediction-message-content"
          style={{
            minWidth: 0,
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <strong
              style={{
                fontSize: "12px",
                lineHeight: 1.3,
              }}
            >
              {username}
            </strong>

            {formattedDate ? (
              <span
                style={{
                  flexShrink: 0,
                  fontSize: "9px",
                  color: "var(--muted)",
                  textAlign: "right",
                  lineHeight: 1.3,
                }}
              >
                {formattedDate}
                <br />
                {formattedTime}
              </span>
            ) : null}
          </div>

          {match ? (
            <div
              style={{
                marginTop: "7px",
                fontSize: "12px",
                fontWeight: 800,
                lineHeight: 1.35,
                color: "var(--text)",
              }}
            >
              ⚽ {matchName}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
              marginTop: "7px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 7px",
                borderRadius: "6px",
                background: "var(--primary)",
                color: "#fff",
                fontSize: "9px",
                fontWeight: 800,
              }}
            >
              🎯 Tahmin: {predictionLabel}
            </span>

            {prediction.confidence != null ? (
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color: "var(--text)",
                }}
              >
                📊 Güven: %{prediction.confidence}
              </span>
            ) : null}
          </div>

          {prediction.message ? (
            <div
              style={{
                marginTop: "7px",
                padding: "7px 9px",
                borderRadius: "7px",
                background: "var(--surface-soft)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  marginBottom: "2px",
                  fontSize: "9px",
                  fontWeight: 800,
                  color: "var(--muted)",
                }}
              >
                📝 Analiz
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: "10px",
                  lineHeight: 1.4,
                  color: "var(--text)",
                }}
              >
                {prediction.message}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {match ? (
        <div
          style={{
            display: "flex",
            gap: "5px",
            marginTop: "8px",
            paddingTop: "7px",
            borderTop: "1px solid var(--border)",
          }}
        >
          {user?.id ? (
            <Link
              href={`/profil?user_id=${encodeURIComponent(
                user.id
              )}`}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "25px",
                padding: "4px 6px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: "var(--surface-soft)",
                color: "var(--text)",
                fontSize: "8px",
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
              minHeight: "25px",
              padding: "4px 6px",
              border: "1px solid var(--primary)",
              borderRadius: "6px",
              background: "var(--primary)",
              color: "#fff",
              fontSize: "8px",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            ⚽ Maça Git
          </Link>
        </div>
      ) : null}
    </article>
  );
}
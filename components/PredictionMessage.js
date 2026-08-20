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

        <div className="prediction-message-content">
          <div className="prediction-message-top">
            <strong>{username}</strong>
          </div>

          <div className="prediction-message-result">
            <span className="prediction-badge">
              {predictionLabel}
            </span>

            {prediction.confidence != null ? (
              <span className="prediction-confidence-value">
                Güven %{prediction.confidence}
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
              {formattedDate} · {formattedTime}
            </div>
          ) : null}
        </div>
      </div>

      {match ? (
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "12px",
            paddingTop: "10px",
            borderTop:
              "1px solid var(--border)",
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
                minHeight: "34px",
                padding: "7px 10px",
                border:
                  "1px solid var(--border)",
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
              border:
                "1px solid var(--primary)",
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
      ) : null}
    </article>
  );
}
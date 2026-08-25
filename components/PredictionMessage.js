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
    <article
      className="prediction-message"
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        className="prediction-message-main"
        style={{
          display: "flex",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <div
          className="prediction-message-avatar"
          style={{
            flex: "0 0 auto",
          }}
        >
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
            flex: "1 1 auto",
            width: 0,
            maxWidth: "100%",
            minWidth: 0,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <div
            className="prediction-message-top"
            style={{
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <strong
              style={{
                display: "block",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "12px",
                lineHeight: 1.2,
              }}
            >
              {username}
            </strong>
          </div>

          {match ? (
            <div
              style={{
                marginTop: "5px",
                marginBottom: "6px",
                minWidth: 0,
                maxWidth: "100%",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  maxWidth: "100%",
                  minWidth: 0,
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "var(--text)",
                  lineHeight: 1.25,
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                ⚽ {matchName}
              </div>

              {match.league ? (
                <div
                  style={{
                    marginTop: "2px",
                    maxWidth: "100%",
                    minWidth: 0,
                    fontSize: "9px",
                    color: "var(--muted)",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  🏆 {match.league}
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
              maxWidth: "100%",
              minWidth: 0,
              marginBottom: "5px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                maxWidth: "100%",
                boxSizing: "border-box",
                padding: "4px 7px",
                borderRadius: "6px",
                background: "var(--primary)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 800,
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              🎯 {predictionLabel}
            </span>

            {prediction.confidence != null ? (
              <span
                style={{
                  maxWidth: "100%",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--text)",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                📊 %{prediction.confidence}
              </span>
            ) : null}
          </div>

          {prediction.message ? (
            <div
              style={{
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                marginTop: "5px",
                padding: "7px 9px",
                borderRadius: "7px",
                background: "var(--surface-soft)",
                border: "1px solid var(--border)",
                boxSizing: "border-box",
                overflow: "hidden",
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
                  maxWidth: "100%",
                  fontSize: "10px",
                  lineHeight: 1.35,
                  color: "var(--text)",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                {prediction.message}
              </p>
            </div>
          ) : null}

          {formattedDate ? (
            <div
              style={{
                marginTop: "5px",
                maxWidth: "100%",
                fontSize: "8px",
                color: "var(--muted)",
                overflowWrap: "anywhere",
              }}
            >
              🕐 {formattedDate} · {formattedTime}
            </div>
          ) : null}
        </div>
      </div>

      {match ? (
        <div
          style={{
            display: "flex",
            gap: "5px",
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            marginTop: "7px",
            paddingTop: "6px",
            borderTop: "1px solid var(--border)",
            boxSizing: "border-box",
          }}
        >
          {user?.id ? (
            <Link
              href={`/profil?user_id=${encodeURIComponent(
                user.id
              )}`}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "29px",
                padding: "5px 6px",
                border: "1px solid var(--border)",
                borderRadius: "7px",
                background: "var(--surface-soft)",
                color: "var(--text)",
                fontSize: "9px",
                fontWeight: 800,
                textDecoration: "none",
                boxSizing: "border-box",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              👤 Profil
            </Link>
          ) : null}

          <Link
            href={`/mac/${encodeURIComponent(
              match.external_id
            )}`}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "29px",
              padding: "5px 6px",
              border: "1px solid var(--primary)",
              borderRadius: "7px",
              background: "var(--primary)",
              color: "#fff",
              fontSize: "9px",
              fontWeight: 800,
              textDecoration: "none",
              boxSizing: "border-box",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            ⚽ Maça Git
          </Link>
        </div>
      ) : null}
    </article>
  );
}
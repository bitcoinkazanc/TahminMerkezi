"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PredictionMessage({
  prediction,
}) {
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentTelegramId, setCurrentTelegramId] =
    useState(null);

  useEffect(() => {
    try {
      const telegramUser =
        window?.Telegram?.WebApp?.initDataUnsafe?.user;

      if (telegramUser?.id) {
        setCurrentTelegramId(
          String(telegramUser.id)
        );
      }
    } catch (error) {
      console.error(
        "Telegram user lookup error:",
        error
      );
    }
  }, []);

  if (!prediction || deleted) {
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

  const isOwner =
    currentTelegramId &&
    user?.telegram_id &&
    String(user.telegram_id) ===
      String(currentTelegramId);

  function openDeleteConfirm() {
    if (deleting || !isOwner) {
      return;
    }

    setShowConfirm(true);
  }

  function closeDeleteConfirm() {
    if (deleting) {
      return;
    }

    setShowConfirm(false);
  }

  async function handleDelete() {
    if (deleting || !isOwner) {
      return;
    }

    if (!currentTelegramId) {
      setShowConfirm(false);

      alert(
        "Telegram kullanıcı bilgisi bulunamadı."
      );

      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(
        `/api/predictions?id=${encodeURIComponent(
          prediction.id
        )}&telegram_id=${encodeURIComponent(
          currentTelegramId
        )}`,
        {
          method: "DELETE",
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data?.error ||
            "Tahmin silinemedi."
        );
      }

      setShowConfirm(false);
      setDeleted(true);
    } catch (error) {
      console.error(
        "Prediction delete error:",
        error
      );

      alert(
        error?.message ||
          "Tahmin silinemedi."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
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
                }}
              >
                {username}
              </strong>
            </div>

            {match ? (
              <div
                style={{
                  marginTop: "8px",
                  marginBottom: "10px",
                  minWidth: 0,
                  maxWidth: "100%",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    maxWidth: "100%",
                    minWidth: 0,
                    fontSize: "14px",
                    fontWeight: 800,
                    color: "var(--text)",
                    lineHeight: 1.35,
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  ⚽ {matchName}
                </div>

                {match.league ? (
                  <div
                    style={{
                      marginTop: "3px",
                      maxWidth: "100%",
                      minWidth: 0,
                      fontSize: "11px",
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
                gap: "8px",
                flexWrap: "wrap",
                maxWidth: "100%",
                minWidth: 0,
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  background: "var(--primary)",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 800,
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                🎯 Tahmin: {predictionLabel}
              </span>

              {prediction.confidence != null ? (
                <span
                  style={{
                    maxWidth: "100%",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "var(--text)",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  📊 Güven: %{prediction.confidence}
                </span>
              ) : null}
            </div>

            {prediction.message ? (
              <div
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  marginTop: "8px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "var(--surface-soft)",
                  border: "1px solid var(--border)",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    marginBottom: "4px",
                    fontSize: "11px",
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
                    fontSize: "12px",
                    lineHeight: 1.5,
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
                  marginTop: "8px",
                  maxWidth: "100%",
                  fontSize: "10px",
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
              gap: "8px",
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              marginTop: "12px",
              paddingTop: "10px",
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
                  minHeight: "34px",
                  padding: "7px 8px",
                  border: "1px solid var(--border)",
                  borderRadius: "9px",
                  background: "var(--surface-soft)",
                  color: "var(--text)",
                  fontSize: "11px",
                  fontWeight: 800,
                  textDecoration: "none",
                  boxSizing: "border-box",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                👤 Profile Git
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
                minHeight: "34px",
                padding: "7px 8px",
                border: "1px solid var(--primary)",
                borderRadius: "9px",
                background: "var(--primary)",
                color: "#fff",
                fontSize: "11px",
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

            {isOwner ? (
              <button
                type="button"
                onClick={openDeleteConfirm}
                disabled={deleting}
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "34px",
                  padding: "7px 8px",
                  border: "1px solid #dc2626",
                  borderRadius: "9px",
                  background: "#dc2626",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: 800,
                  boxSizing: "border-box",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  cursor: deleting
                    ? "not-allowed"
                    : "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                🗑 Tahmin Sil
              </button>
            ) : null}
          </div>
        ) : null}
      </article>

      {showConfirm ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(0, 0, 0, 0.55)",
            boxSizing: "border-box",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              width: "100%",
              maxWidth: "360px",
              padding: "20px",
              borderRadius: "16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow:
                "0 20px 50px rgba(0,0,0,0.25)",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                fontSize: "17px",
                fontWeight: 900,
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Tahmini Sil
            </div>

            <div
              style={{
                fontSize: "13px",
                lineHeight: 1.5,
                color: "var(--muted)",
                marginBottom: "18px",
              }}
            >
              Bu tahmini silmek istediğinizden
              emin misiniz?
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                width: "100%",
              }}
            >
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={deleting}
                style={{
                  flex: "1 1 0",
                  minHeight: "40px",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  background: "var(--surface-soft)",
                  color: "var(--text)",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: deleting
                    ? "not-allowed"
                    : "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: "1 1 0",
                  minHeight: "40px",
                  border: "1px solid #dc2626",
                  borderRadius: "10px",
                  background: "#dc2626",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 800,
                  cursor: deleting
                    ? "not-allowed"
                    : "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting
                  ? "Siliniyor..."
                  : "Evet, Sil"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
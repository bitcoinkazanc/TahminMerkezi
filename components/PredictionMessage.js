"use client";

export default function PredictionMessage({
  prediction,
}) {
  if (!prediction) {
    return null;
  }

  const user = prediction.users;

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
    </article>
  );
}
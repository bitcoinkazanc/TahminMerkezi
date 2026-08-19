"use client";

export default function PredictionMessage({ prediction }) {
  if (!prediction) {
    return null;
  }

  const user = prediction.users;

  const name =
    [user?.first_name, user?.last_name]
      .filter(Boolean)
      .join(" ") ||
    user?.username ||
    "Telegram Kullanıcısı";

  const avatarLetter = (
    user?.first_name ||
    user?.username ||
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
          month: "2-digit",
          year: "numeric",
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
      <div className="prediction-message-user">
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={name}
            className="user-avatar"
          />
        ) : (
          <div className="user-avatar-placeholder">
            {avatarLetter}
          </div>
        )}

        <div>
          <strong>{name}</strong>

          {user?.username ? (
            <span className="prediction-username">
              @{user.username}
            </span>
          ) : null}
        </div>
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
          {formattedDate} {formattedTime}
        </div>
      ) : null}
    </article>
  );
}
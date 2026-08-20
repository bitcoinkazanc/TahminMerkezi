"use client";

import { useState } from "react";

export default function PredictionBox({
  match,
  onPredictionCreated,
}) {
  const [prediction, setPrediction] = useState("");
  const [confidence, setConfidence] = useState(50);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const options = [
    {
      value: "MS1",
      label: "MS 1",
      description: "Ev sahibi kazanır",
    },
    {
      value: "MSX",
      label: "MS X",
      description: "Beraberlik",
    },
    {
      value: "MS2",
      label: "MS 2",
      description: "Deplasman kazanır",
    },
  ];

  async function handleSubmit(event) {
    event.preventDefault();

    if (!prediction) {
      setError("Lütfen bir tahmin seç.");
      return;
    }

    if (!match?.id) {
      setError("Maç bilgisi bulunamadı.");
      return;
    }

    try {
      setSending(true);
      setError("");

      const savedUser =
        localStorage.getItem("tm_user");

      if (!savedUser) {
        setError(
          "Tahmin yapmak için Telegram üzerinden giriş yapmalısın."
        );
        return;
      }

      const user = JSON.parse(savedUser);

      if (!user?.id) {
        setError(
          "Kullanıcı bilgisi bulunamadı."
        );
        return;
      }

      const response = await fetch(
        "/api/predictions",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            user_id: user.id,
            match_id: match.id,
            prediction,
            confidence: Number(confidence),
            message:
              message.trim() || null,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Tahmin gönderilemedi."
        );
      }

      setPrediction("");
      setConfidence(50);
      setMessage("");

      if (onPredictionCreated) {
        onPredictionCreated(
          result.prediction
        );
      }
    } catch (err) {
      console.error(
        "Prediction error:",
        err
      );

      setError(
        err.message ||
          "Tahmin gönderilirken bir hata oluştu."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      className="prediction-box"
      onSubmit={handleSubmit}
    >
      <div className="prediction-options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`prediction-option ${
              prediction === option.value
                ? "selected"
                : ""
            }`}
            onClick={() =>
              setPrediction(
                option.value
              )
            }
            disabled={sending}
          >
            <strong>
              {option.label}
            </strong>

            <span>
              {option.description}
            </span>
          </button>
        ))}
      </div>

      <div className="prediction-confidence">
        <div className="prediction-field-header">
          <label htmlFor="confidence">
            Güven Seviyesi
          </label>

          <strong>
            %{confidence}
          </strong>
        </div>

        <input
          id="confidence"
          type="range"
          min="1"
          max="100"
          value={confidence}
          onChange={(event) =>
            setConfidence(
              event.target.value
            )
          }
          disabled={sending}
        />
      </div>

      <div className="prediction-message-field">
        <label htmlFor="prediction-message">
          Analiz / Yorum
        </label>

        <textarea
          id="prediction-message"
          value={message}
          onChange={(event) =>
            setMessage(
              event.target.value
            )
          }
          placeholder="İstersen maç hakkındaki düşünceni yaz..."
          maxLength={2000}
          rows={4}
          disabled={sending}
        />

        <small>
          {message.length}/2000
        </small>
      </div>

      {error ? (
        <div className="prediction-error">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        className="primary-button prediction-submit"
        disabled={
          sending || !prediction
        }
      >
        {sending
          ? "Gönderiliyor..."
          : "Tahminimi Gönder"}
      </button>
    </form>
  );
}
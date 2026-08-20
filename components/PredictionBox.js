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
  const [activeCategory, setActiveCategory] =
    useState("ms");

  const categories = [
    {
      id: "ms",
      label: "🏆 MS",
    },
    {
      id: "double-chance",
      label: "🎯 Çifte Şans",
    },
    {
      id: "over-under",
      label: "⬆️ Üst/Alt",
    },
    {
      id: "first-half",
      label: "🕐 1. Yarı",
    },
    {
      id: "second-half",
      label: "🕐 2. Yarı",
    },
    {
      id: "other",
      label: "🎯 Diğer",
    },
  ];

  const predictionCategories = {
    ms: [
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
    ],

    "double-chance": [
      {
        value: "DOUBLE_1X",
        label: "1-X",
        description:
          "Ev sahibi veya beraberlik",
      },
      {
        value: "DOUBLE_12",
        label: "1-2",
        description:
          "Taraflardan biri kazanır",
      },
      {
        value: "DOUBLE_X2",
        label: "X-2",
        description:
          "Beraberlik veya deplasman",
      },
    ],

    "over-under": [
      {
        value: "OVER_0_5",
        label: "0,5 Üst",
        description:
          "Toplam gol 1 veya daha fazla",
      },
      {
        value: "UNDER_0_5",
        label: "0,5 Alt",
        description:
          "Toplam gol 0",
      },
      {
        value: "OVER_1_5",
        label: "1,5 Üst",
        description:
          "Toplam gol 2 veya daha fazla",
      },
      {
        value: "UNDER_1_5",
        label: "1,5 Alt",
        description:
          "Toplam gol 0-1",
      },
      {
        value: "OVER_2_5",
        label: "2,5 Üst",
        description:
          "Toplam gol 3 veya daha fazla",
      },
      {
        value: "UNDER_2_5",
        label: "2,5 Alt",
        description:
          "Toplam gol 0-2",
      },
      {
        value: "OVER_3_5",
        label: "3,5 Üst",
        description:
          "Toplam gol 4 veya daha fazla",
      },
      {
        value: "UNDER_3_5",
        label: "3,5 Alt",
        description:
          "Toplam gol 0-3",
      },
      {
        value: "OVER_4_5",
        label: "4,5 Üst",
        description:
          "Toplam gol 5 veya daha fazla",
      },
      {
        value: "UNDER_4_5",
        label: "4,5 Alt",
        description:
          "Toplam gol 0-4",
      },
    ],

    "first-half": [
      {
        value: "HT_1",
        label: "İY 1",
        description:
          "Ev sahibi ilk yarıyı kazanır",
      },
      {
        value: "HT_X",
        label: "İY X",
        description:
          "İlk yarı berabere",
      },
      {
        value: "HT_2",
        label: "İY 2",
        description:
          "Deplasman ilk yarıyı kazanır",
      },
      {
        value: "HT_OVER_0_5",
        label: "İY 0,5 Üst",
        description:
          "İlk yarıda en az 1 gol",
      },
      {
        value: "HT_UNDER_0_5",
        label: "İY 0,5 Alt",
        description:
          "İlk yarıda gol yok",
      },
      {
        value: "HT_OVER_1_5",
        label: "İY 1,5 Üst",
        description:
          "İlk yarıda en az 2 gol",
      },
      {
        value: "HT_UNDER_1_5",
        label: "İY 1,5 Alt",
        description:
          "İlk yarıda 0-1 gol",
      },
      {
        value: "HT_OVER_2_5",
        label: "İY 2,5 Üst",
        description:
          "İlk yarıda en az 3 gol",
      },
      {
        value: "HT_UNDER_2_5",
        label: "İY 2,5 Alt",
        description:
          "İlk yarıda 0-2 gol",
      },
    ],

    "second-half": [
      {
        value: "SECOND_HALF_1",
        label: "2Y 1",
        description:
          "İkinci yarıyı ev sahibi kazanır",
      },
      {
        value: "SECOND_HALF_X",
        label: "2Y X",
        description:
          "İkinci yarı berabere",
      },
      {
        value: "SECOND_HALF_2",
        label: "2Y 2",
        description:
          "İkinci yarıyı deplasman kazanır",
      },
    ],

    other: [
      {
        value: "ODD",
        label: "Tek",
        description:
          "Toplam gol tek sayı",
      },
      {
        value: "EVEN",
        label: "Çift",
        description:
          "Toplam gol çift sayı",
      },
      {
        value: "GOAL_RANGE_0_1",
        label: "0-1 Gol",
        description:
          "Toplam 0 veya 1 gol",
      },
      {
        value: "GOAL_RANGE_2_3",
        label: "2-3 Gol",
        description:
          "Toplam 2 veya 3 gol",
      },
      {
        value: "GOAL_RANGE_4_5",
        label: "4-5 Gol",
        description:
          "Toplam 4 veya 5 gol",
      },
      {
        value: "GOAL_RANGE_6_PLUS",
        label: "6+ Gol",
        description:
          "Toplam 6 veya daha fazla gol",
      },
      {
        value: "BTTS_YES",
        label: "KG Var",
        description:
          "İki takım da gol atar",
      },
      {
        value: "BTTS_NO",
        label: "KG Yok",
        description:
          "En az bir takım gol atamaz",
      },
      {
        value: "FIRST_GOAL_HOME",
        label: "İlk Gol 1",
        description:
          "İlk golü ev sahibi atar",
      },
      {
        value: "FIRST_GOAL_NONE",
        label: "İlk Gol Olmaz",
        description:
          "Maçta gol olmaz",
      },
      {
        value: "FIRST_GOAL_AWAY",
        label: "İlk Gol 2",
        description:
          "İlk golü deplasman atar",
      },
    ],
  };

  const activeOptions =
    predictionCategories[activeCategory] || [];

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
      <div
        className="prediction-categories"
        style={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          overflowY: "hidden",
          whiteSpace: "nowrap",
          paddingBottom: "4px",
          scrollbarWidth: "none",
        }}
      >
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`prediction-category ${
              activeCategory === category.id
                ? "active"
                : ""
            }`}
            onClick={() => {
              setActiveCategory(
                category.id
              );
              setPrediction("");
              setError("");
            }}
            disabled={sending}
            style={{
              flex: "0 0 auto",
              whiteSpace: "nowrap",
            }}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div
        className="prediction-options"
        style={{
          height: "320px",
          maxHeight: "320px",
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: "5px",
        }}
      >
        {activeOptions.map((option) => (
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
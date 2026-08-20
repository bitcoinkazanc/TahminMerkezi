"use client";

import { useState } from "react";

export default function PredictionBox({
  match,
  onPredictionCreated,
}) {
  const [prediction, setPrediction] =
    useState("");

  const [confidence, setConfidence] =
    useState(50);

  const [message, setMessage] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState("");

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

  const [activeCategory, setActiveCategory] =
    useState("ms");

  const optionsByCategory = {
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
        value: "DC1X",
        label: "1-X",
        description:
          "Ev sahibi kazanır veya beraberlik",
      },
      {
        value: "DC12",
        label: "1-2",
        description:
          "Maç berabere bitmez",
      },
      {
        value: "DCX2",
        label: "X-2",
        description:
          "Deplasman kazanır veya beraberlik",
      },
    ],

    "over-under": [
      {
        value: "U05",
        label: "0,5 Alt",
        description: "Toplam gol 0",
      },
      {
        value: "O05",
        label: "0,5 Üst",
        description: "En az 1 gol",
      },
      {
        value: "U15",
        label: "1,5 Alt",
        description: "Toplam 0-1 gol",
      },
      {
        value: "O15",
        label: "1,5 Üst",
        description: "En az 2 gol",
      },
      {
        value: "U25",
        label: "2,5 Alt",
        description: "Toplam 0-2 gol",
      },
      {
        value: "O25",
        label: "2,5 Üst",
        description: "En az 3 gol",
      },
      {
        value: "U35",
        label: "3,5 Alt",
        description: "Toplam 0-3 gol",
      },
      {
        value: "O35",
        label: "3,5 Üst",
        description: "En az 4 gol",
      },
      {
        value: "U45",
        label: "4,5 Alt",
        description: "Toplam 0-4 gol",
      },
      {
        value: "O45",
        label: "4,5 Üst",
        description: "En az 5 gol",
      },
    ],

    "first-half": [
      {
        value: "HT1",
        label: "İY 1",
        description:
          "Ev sahibi ilk yarıyı kazanır",
      },
      {
        value: "HTX",
        label: "İY X",
        description:
          "İlk yarı beraberlik",
      },
      {
        value: "HT2",
        label: "İY 2",
        description:
          "Deplasman ilk yarıyı kazanır",
      },
      {
        value: "HTU05",
        label: "İY 0,5 Alt",
        description: "İlk yarıda 0 gol",
      },
      {
        value: "HTO05",
        label: "İY 0,5 Üst",
        description:
          "İlk yarıda en az 1 gol",
      },
      {
        value: "HTU15",
        label: "İY 1,5 Alt",
        description:
          "İlk yarıda 0-1 gol",
      },
      {
        value: "HTO15",
        label: "İY 1,5 Üst",
        description:
          "İlk yarıda en az 2 gol",
      },
      {
        value: "HTU25",
        label: "İY 2,5 Alt",
        description:
          "İlk yarıda 0-2 gol",
      },
      {
        value: "HTO25",
        label: "İY 2,5 Üst",
        description:
          "İlk yarıda en az 3 gol",
      },
      {
        value: "HTDC1X",
        label: "İY 1-X",
        description:
          "İlk yarı 1 veya X",
      },
      {
        value: "HTDC12",
        label: "İY 1-2",
        description:
          "İlk yarı 1 veya 2",
      },
      {
        value: "HTDCX2",
        label: "İY X-2",
        description:
          "İlk yarı X veya 2",
      },
    ],

    "second-half": [
      {
        value: "2H1",
        label: "2Y 1",
        description:
          "İkinci yarıyı ev sahibi kazanır",
      },
      {
        value: "2HX",
        label: "2Y X",
        description:
          "İkinci yarı beraberlik",
      },
      {
        value: "2H2",
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
          "Toplam gol tek",
      },
      {
        value: "EVEN",
        label: "Çift",
        description:
          "Toplam gol çift",
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
          "Takımlardan biri gol atamaz",
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
      {
        value: "MOST_GOALS_1H",
        label: "En Çok Gol 1Y",
        description:
          "Daha fazla gol ilk yarıda",
      },
      {
        value: "MOST_GOALS_EQUAL",
        label: "En Çok Gol Eşit",
        description:
          "İki yarıda eşit gol",
      },
      {
        value: "MOST_GOALS_2H",
        label: "En Çok Gol 2Y",
        description:
          "Daha fazla gol ikinci yarıda",
      },
    ],
  };

  const activeOptions =
    optionsByCategory[activeCategory] || [];

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

  function handleCategoryChange(
    categoryId
  ) {
    setActiveCategory(categoryId);
    setPrediction("");
    setError("");
  }

  return (
    <form
      className="prediction-box"
      onSubmit={handleSubmit}
    >
      <div
        style={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          paddingBottom: "7px",
          marginBottom: "8px",
          scrollbarWidth: "thin",
        }}
      >
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() =>
              handleCategoryChange(
                category.id
              )
            }
            disabled={sending}
            style={{
              flexShrink: 0,
              border:
                activeCategory ===
                category.id
                  ? "1px solid var(--primary)"
                  : "1px solid var(--border)",
              borderRadius: "7px",
              background:
                activeCategory ===
                category.id
                  ? "var(--primary)"
                  : "var(--surface-soft)",
              color:
                activeCategory ===
                category.id
                  ? "#fff"
                  : "var(--text)",
              padding: "6px 9px",
              fontSize: "10px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div
        style={{
          border:
            "1px solid var(--border)",
          borderRadius: "9px",
          overflowY: "auto",
          height: "320px",
          padding: "5px",
          background:
            "var(--surface-soft)",
          scrollbarWidth: "thin",
        }}
      >
        {activeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() =>
              setPrediction(
                option.value
              )
            }
            disabled={sending}
            style={{
              width: "100%",
              minHeight: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "8px",
              marginBottom: "4px",
              padding: "6px 9px",
              border:
                prediction === option.value
                  ? "1px solid var(--primary)"
                  : "1px solid var(--border)",
              borderRadius: "6px",
              background:
                prediction === option.value
                  ? "var(--primary)"
                  : "var(--surface)",
              color:
                prediction === option.value
                  ? "#fff"
                  : "var(--text)",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <strong
              style={{
                fontSize: "10px",
                whiteSpace: "nowrap",
              }}
            >
              {option.label}
            </strong>

            <span
              style={{
                fontSize: "8px",
                opacity:
                  prediction === option.value
                    ? 0.9
                    : 0.65,
                textAlign: "right",
              }}
            >
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
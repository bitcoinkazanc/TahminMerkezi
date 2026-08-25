"use client";

import { useEffect, useState } from "react";

export default function LiderlikPage() {
  const [period, setPeriod] =
    useState("all");

  const [leaderboard, setLeaderboard] =
    useState([]);

  const [currentUser, setCurrentUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadLeaderboard(
    selectedPeriod
  ) {
    try {
      setLoading(true);
      setError("");

      let userId = null;

      try {
        const savedUser =
          localStorage.getItem(
            "tm_user"
          );

        if (savedUser) {
          userId =
            JSON.parse(
              savedUser
            )?.id || null;
        }
      } catch {
        userId = null;
      }

      const params =
        new URLSearchParams();

      params.set(
        "period",
        selectedPeriod
      );

      if (userId) {
        params.set(
          "user_id",
          userId
        );
      }

      const response =
        await fetch(
          `/api/leaderboard?${params.toString()}`,
          {
            cache: "no-store",
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
            "Liderlik verileri alınamadı."
        );
      }

      setLeaderboard(
        result.leaderboard ||
          []
      );

      setCurrentUser(
        result.current_user ||
          null
      );
    } catch (err) {
      console.error(
        "Leaderboard loading error:",
        err
      );

      setLeaderboard([]);
      setCurrentUser(null);

      setError(
        err.message ||
          "Liderlik verileri alınamadı."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeaderboard(
      period
    );
  }, [period]);

  function getUserName(user) {
    const fullName =
      [
        user.first_name,
        user.last_name,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

    if (fullName) {
      return fullName;
    }

    if (user.username) {
      return `@${user.username}`;
    }

    return "Telegram kullanıcısı";
  }

  function getPositionStyle(
    position
  ) {
    if (position === 1) {
      return {
        background:
          "rgba(255,193,7,0.16)",
        border:
          "1px solid rgba(255,193,7,0.35)",
      };
    }

    if (position === 2) {
      return {
        background:
          "rgba(158,158,158,0.14)",
        border:
          "1px solid rgba(158,158,158,0.3)",
      };
    }

    if (position === 3) {
      return {
        background:
          "rgba(205,127,50,0.14)",
        border:
          "1px solid rgba(205,127,50,0.3)",
      };
    }

    return {
      background:
        "rgba(128,128,128,0.07)",
      border:
        "1px solid rgba(128,128,128,0.12)",
    };
  }

  return (
    <main
      style={{
        width: "100%",
        maxWidth: "100%",
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: "14px",
        paddingBottom: "100px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <span
          style={{
            fontSize: "25px",
          }}
        >
          🏆
        </span>

        <div
          style={{
            minWidth: 0,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "21px",
              fontWeight: 800,
            }}
          >
            Liderlik
          </h1>

          <p
            style={{
              margin: "2px 0 0",
              fontSize: "11px",
              opacity: 0.65,
            }}
          >
            TahminMerkezi sıralaması
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          width: "100%",
          marginBottom: "14px",
          padding: "3px",
          borderRadius: "10px",
          background:
            "rgba(128,128,128,0.10)",
          boxSizing: "border-box",
        }}
      >
        {[
          {
            value: "all",
            label: "Genel",
          },
          {
            value: "weekly",
            label: "Haftalık",
          },
          {
            value: "monthly",
            label: "Aylık",
          },
        ].map((item) => {
          const active =
            period ===
            item.value;

          return (
            <button
              key={
                item.value
              }
              type="button"
              onClick={() =>
                setPeriod(
                  item.value
                )
              }
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                borderRadius:
                  "8px",
                padding:
                  "8px 3px",
                background:
                  active
                    ? "var(--primary)"
                    : "transparent",
                color:
                  active
                    ? "#fff"
                    : "inherit",
                fontWeight:
                  active
                    ? 800
                    : 700,
                fontSize: "10px",
                cursor:
                  "pointer",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {currentUser ? (
        <section
          style={{
            width: "100%",
            marginBottom: "14px",
            padding: "12px",
            borderRadius: "12px",
            background:
              "var(--primary)",
            color: "#fff",
            boxSizing:
              "border-box",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap: "10px",
            }}
          >
            <div
              style={{
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize:
                    "10px",
                  opacity:
                    0.8,
                  marginBottom:
                    "3px",
                }}
              >
                SENİN SIRAN
              </div>

              <div
                style={{
                  fontSize:
                    "22px",
                  fontWeight:
                    900,
                }}
              >
                #{currentUser.position}
              </div>
            </div>

            <div
              style={{
                textAlign:
                  "right",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize:
                    "12px",
                  fontWeight:
                    800,
                }}
              >
                {currentUser.rank
                  ?.icon}{" "}
                {currentUser.rank
                  ?.name}
              </div>

              <div
                style={{
                  marginTop:
                    "3px",
                  fontSize:
                    "10px",
                  opacity:
                    0.85,
                }}
              >
                {currentUser.accuracy}% başarı
                {" · "}
                {currentUser.points} puan
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {loading ? (
        <section
          style={{
            padding:
              "35px 15px",
            textAlign:
              "center",
            opacity: 0.65,
            fontSize:
              "12px",
          }}
        >
          Liderlik yükleniyor...
        </section>
      ) : error ? (
        <section
          style={{
            padding:
              "20px 14px",
            textAlign:
              "center",
            borderRadius:
              "12px",
            background:
              "rgba(220,53,69,0.08)",
            color:
              "#dc3545",
            fontSize:
              "12px",
          }}
        >
          {error}
        </section>
      ) : leaderboard.length ===
        0 ? (
        <section
          style={{
            padding:
              "35px 15px",
            textAlign:
              "center",
            borderRadius:
              "12px",
            background:
              "rgba(128,128,128,0.08)",
          }}
        >
          <div
            style={{
              fontSize:
                "30px",
              marginBottom:
                "8px",
            }}
          >
            🏆
          </div>

          <strong
            style={{
              display:
                "block",
              fontSize:
                "14px",
            }}
          >
            Henüz liderlik verisi yok
          </strong>

          <p
            style={{
              margin:
                "6px 0 0",
              fontSize:
                "11px",
              opacity:
                0.65,
            }}
          >
            Tahmin yapan kullanıcılar
            burada sıralanacak.
          </p>
        </section>
      ) : (
        <div
          style={{
            display:
              "flex",
            flexDirection:
              "column",
            gap: "7px",
          }}
        >
          {leaderboard.map(
            (user) => {
              const positionStyle =
                getPositionStyle(
                  user.position
                );

              return (
                <div
                  key={
                    user.id
                  }
                  style={{
                    width:
                      "100%",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: "9px",
                    padding:
                      "9px",
                    borderRadius:
                      "11px",
                    background:
                      positionStyle.background,
                    border:
                      positionStyle.border,
                    boxSizing:
                      "border-box",
                  }}
                >
                  <div
                    style={{
                      width:
                        "28px",
                      minWidth:
                        "28px",
                      textAlign:
                        "center",
                      fontSize:
                        user.position <=
                        3
                          ? "17px"
                          : "11px",
                      fontWeight:
                        900,
                    }}
                  >
                    {user.position ===
                    1
                      ? "🥇"
                      : user.position ===
                        2
                        ? "🥈"
                        : user.position ===
                          3
                          ? "🥉"
                          : `#${user.position}`}
                  </div>

                  {user.avatar_url ? (
                    <img
                      src={
                        user.avatar_url
                      }
                      alt=""
                      width={
                        40
                      }
                      height={
                        40
                      }
                      style={{
                        width:
                          "40px",
                        height:
                          "40px",
                        minWidth:
                          "40px",
                        borderRadius:
                          "50%",
                        objectFit:
                          "cover",
                        flexShrink:
                          0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width:
                          "40px",
                        height:
                          "40px",
                        minWidth:
                          "40px",
                        borderRadius:
                          "50%",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        background:
                          "var(--primary)",
                        color:
                          "#fff",
                        fontSize:
                          "15px",
                        fontWeight:
                          900,
                        flexShrink:
                          0,
                      }}
                    >
                      {(
                        user.first_name ||
                        user.username ||
                        "T"
                      )
                        .charAt(
                          0
                        )
                        .toUpperCase()}
                    </div>
                  )}

                  <div
                    style={{
                      flex:
                        "1 1 auto",
                      minWidth:
                        0,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: "4px",
                        minWidth:
                          0,
                      }}
                    >
                      <strong
                        style={{
                          minWidth:
                            0,
                          overflow:
                            "hidden",
                          textOverflow:
                            "ellipsis",
                          whiteSpace:
                            "nowrap",
                          fontSize:
                            "12px",
                        }}
                      >
                        {getUserName(
                          user
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        marginTop:
                          "3px",
                        fontSize:
                          "9px",
                        opacity:
                          0.7,
                        whiteSpace:
                          "nowrap",
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                      }}
                    >
                      {user.rank
                        ?.icon}{" "}
                      {user.rank
                        ?.name}
                      {" · "}
                      {user.accuracy}%
                      {" · "}
                      {user.correct} doğru
                    </div>
                  </div>

                  <div
                    style={{
                      minWidth:
                        "58px",
                      textAlign:
                        "right",
                      flexShrink:
                        0,
                    }}
                  >
                    <strong
                      style={{
                        display:
                          "block",
                        fontSize:
                          "13px",
                      }}
                    >
                      {user.points}
                    </strong>

                    <span
                      style={{
                        display:
                          "block",
                        marginTop:
                          "1px",
                        fontSize:
                          "8px",
                        opacity:
                          0.6,
                      }}
                    >
                      PUAN
                    </span>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </main>
  );
}
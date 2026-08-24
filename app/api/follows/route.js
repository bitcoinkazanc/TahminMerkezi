"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ProfileCard from "../../components/ProfileCard";
import Loading from "../../components/Loading";

export default function ProfilePage() {
  const searchParams = useSearchParams();

  const [user, setUser] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentUser, setCurrentUser] =
    useState(null);

  const [isFollowing, setIsFollowing] =
    useState(false);

  const [followersCount, setFollowersCount] =
    useState(0);

  const [followingCount, setFollowingCount] =
    useState(0);

  const [followLoading, setFollowLoading] =
    useState(false);

  const profileUserId =
    searchParams.get("user_id");

  /*
   * ==================================================
   * MEVCUT TELEGRAM KULLANICISINI BUL
   * ==================================================
   */

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem("tm_user");

      if (!savedUser) {
        return;
      }

      const parsedUser =
        JSON.parse(savedUser);

      if (parsedUser?.id) {
        setCurrentUser(parsedUser);
      }
    } catch (error) {
      console.error(
        "Current user lookup error:",
        error
      );
    }
  }, []);

  /*
   * ==================================================
   * PROFİLİ YÜKLE
   * ==================================================
   */

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        setUser(null);
        setPredictions([]);

        let profileUser = null;

        if (profileUserId) {
          const response = await fetch(
            `/api/users/${encodeURIComponent(
              profileUserId
            )}`,
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
                "Kullanıcı profili alınamadı."
            );
          }

          profileUser =
            result.user;
        } else {
          const savedUser =
            localStorage.getItem(
              "tm_user"
            );

          if (!savedUser) {
            setLoading(false);
            return;
          }

          const parsedUser =
            JSON.parse(savedUser);

          if (!parsedUser?.id) {
            setLoading(false);
            return;
          }

          profileUser =
            parsedUser;
        }

        setUser(profileUser);

        /*
         * --------------------------------------------------
         * TAHMİNLERİ YÜKLE
         * --------------------------------------------------
         */

        const response =
          await fetch(
            `/api/predictions?user_id=${encodeURIComponent(
              profileUser.id
            )}`,
            {
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (
          response.ok &&
          result.success
        ) {
          setPredictions(
            result.predictions || []
          );
        }
      } catch (error) {
        console.error(
          "Profile loading error:",
          error
        );

        setError(
          error.message ||
            "Profil yüklenirken bir hata oluştu."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [profileUserId]);

  /*
   * ==================================================
   * TAKİP BİLGİLERİNİ YÜKLE
   * ==================================================
   */

  useEffect(() => {
    async function loadFollowStatus() {
      if (
        !user?.id ||
        !currentUser?.id
      ) {
        setIsFollowing(false);
        setFollowersCount(0);
        setFollowingCount(0);
        return;
      }

      try {
        const response =
          await fetch(
            `/api/follows?follower_id=${encodeURIComponent(
              currentUser.id
            )}&following_id=${encodeURIComponent(
              user.id
            )}`,
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
              "Takip bilgileri alınamadı."
          );
        }

        setIsFollowing(
          !!result.is_following
        );

        setFollowersCount(
          Number(
            result.followers_count
          ) || 0
        );

        setFollowingCount(
          Number(
            result.following_count
          ) || 0
        );
      } catch (error) {
        console.error(
          "Follow status loading error:",
          error
        );
      }
    }

    loadFollowStatus();
  }, [
    user?.id,
    currentUser?.id,
  ]);

  /*
   * ==================================================
   * TAKİP ET / TAKİBİ BIRAK
   * ==================================================
   */

  async function handleFollowToggle() {
    if (
      followLoading ||
      !currentUser?.id ||
      !user?.id
    ) {
      return;
    }

    if (
      currentUser.id ===
      user.id
    ) {
      return;
    }

    try {
      setFollowLoading(true);

      if (isFollowing) {
        const response =
          await fetch(
            `/api/follows?follower_id=${encodeURIComponent(
              currentUser.id
            )}&following_id=${encodeURIComponent(
              user.id
            )}`,
            {
              method: "DELETE",
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
              "Takip bırakılamadı."
          );
        }

        setIsFollowing(false);

        setFollowersCount(
          (value) =>
            Math.max(
              0,
              value - 1
            )
        );
      } else {
        const response =
          await fetch(
            "/api/follows",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                follower_id:
                  currentUser.id,
                following_id:
                  user.id,
              }),
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
              "Takip edilemedi."
          );
        }

        setIsFollowing(true);

        setFollowersCount(
          (value) =>
            value + 1
        );
      }
    } catch (error) {
      console.error(
        "Follow toggle error:",
        error
      );

      alert(
        error.message ||
          "Takip işlemi gerçekleştirilemedi."
      );
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <main
        className="page"
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "hidden",
          boxSizing: "border-box",
          paddingBottom: "100px",
        }}
      >
        <div
          className="page-container"
          style={{
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          <div className="error-box">
            <h2>
              Bir sorun oluştu
            </h2>

            <p>{error}</p>

            <Link
              href="/"
              className="primary-button"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main
        className="page"
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "hidden",
          boxSizing: "border-box",
          paddingBottom: "100px",
        }}
      >
        <div
          className="page-container"
          style={{
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          <div className="empty-state profile-empty">
            <div className="empty-icon">
              👤
            </div>

            <h1>Profil</h1>

            <p>
              Profil bilgilerini görmek için
              Telegram üzerinden uygulamayı
              açmalısın.
            </p>

            <Link
              href="/"
              className="primary-button"
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ==================================================
   * PROFİL İSTATİSTİKLERİ
   * ==================================================
   */

  const totalPredictions =
    predictions.length;

  const correctPredictions =
    predictions.filter(
      (item) =>
        item.result ===
        "correct"
    ).length;

  const wrongPredictions =
    predictions.filter(
      (item) =>
        item.result ===
        "wrong"
    ).length;

  const pendingPredictions =
    predictions.filter(
      (item) =>
        !item.result ||
        item.result ===
          "pending"
    ).length;

  const completedPredictions =
    correctPredictions +
    wrongPredictions;

  const successRate =
    completedPredictions > 0
      ? Math.round(
          (correctPredictions /
            completedPredictions) *
            100
        )
      : 0;

  const totalPoints =
    predictions.reduce(
      (total, item) =>
        total +
        (Number(item.points) || 0),
      0
    );

  const isOwnProfile =
    currentUser?.id &&
    user?.id &&
    String(
      currentUser.id
    ) ===
      String(user.id);

  return (
    <main
      className="page"
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "hidden",
        boxSizing: "border-box",
        paddingBottom: "100px",
      }}
    >
      <div
        className="page-container"
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          overflowX: "hidden",
        }}
      >
        <ProfileCard user={user} />

        /*
         * Takip butonu ve takip sayıları
         */
        {!isOwnProfile &&
        currentUser?.id ? (
          <section
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              marginTop: "12px",
              marginBottom: "12px",
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              onClick={
                handleFollowToggle
              }
              disabled={
                followLoading
              }
              style={{
                width: "100%",
                minHeight: "42px",
                border:
                  isFollowing
                    ? "1px solid var(--border)"
                    : "1px solid var(--primary)",
                borderRadius: "10px",
                background:
                  isFollowing
                    ? "var(--surface-soft)"
                    : "var(--primary)",
                color:
                  isFollowing
                    ? "var(--text)"
                    : "#fff",
                fontSize: "13px",
                fontWeight: 800,
                cursor:
                  followLoading
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  followLoading
                    ? 0.6
                    : 1,
                boxSizing:
                  "border-box",
              }}
            >
              {followLoading
                ? "İşleniyor..."
                : isFollowing
                  ? "✓ Takiptesin"
                  : "+ Takip Et"}
            </button>
          </section>
        ) : null}

        <section
          className="profile-stats"
          style={{
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
          }}
        >
          <div className="stat-card">
            <strong>
              {totalPredictions}
            </strong>

            <span>
              Toplam Tahmin
            </span>
          </div>

          <div className="stat-card">
            <strong>
              {successRate}%
            </strong>

            <span>
              Başarı Oranı
            </span>
          </div>

          <div className="stat-card">
            <strong>
              {totalPoints}
            </strong>

            <span>
              Puan
            </span>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "10px",
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            marginTop: "10px",
            marginBottom: "14px",
            boxSizing: "border-box",
          }}
        >
          <div
            className="stat-card"
            style={{
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            <strong>
              {followersCount}
            </strong>

            <span>
              Takipçi
            </span>
          </div>

          <div
            className="stat-card"
            style={{
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            <strong>
              {followingCount}
            </strong>

            <span>
              Takip
            </span>
          </div>
        </section>

        <section
          className="section-card"
          style={{
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div className="section-title">
            <h2>
              Tahminlerim
            </h2>

            <p>
              Daha önce yaptığı tahminler.
            </p>
          </div>

          {predictions.length === 0 ? (
            <div className="empty-state small">
              <div className="empty-icon">
                🎯
              </div>

              <h3>
                Henüz tahmin yok
              </h3>

              <p>
                Bu kullanıcının henüz
                yaptığı bir tahmin bulunmuyor.
              </p>
            </div>
          ) : (
            <div
              className="my-predictions"
              style={{
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              {predictions.map(
                (item) => {
                  const match =
                    item.matches;

                  const matchName =
                    match
                      ? `${match.home_team} - ${match.away_team}`
                      : "Maç bilgisi yok";

                  const predictionLabel =
                    item.prediction ===
                    "MS1"
                      ? "MS 1"
                      : item.prediction ===
                        "MSX"
                        ? "MS X"
                        : item.prediction ===
                          "MS2"
                          ? "MS 2"
                          : item.prediction;

                  const date =
                    item.created_at
                      ? new Date(
                          item.created_at
                        ).toLocaleDateString(
                          "tr-TR"
                        )
                      : "";

                  const resultLabel =
                    item.result ===
                    "correct"
                      ? "✓ Doğru"
                      : item.result ===
                        "wrong"
                        ? "✕ Yanlış"
                        : "⏳ Bekliyor";

                  const points =
                    Number(
                      item.points
                    ) || 0;

                  const content = (
                    <div
                      className="my-prediction-item"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        maxWidth: "100%",
                        minWidth: 0,
                        boxSizing: "border-box",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        className="my-prediction-info"
                        style={{
                          flex: "1 1 auto",
                          width: 0,
                          minWidth: 0,
                          maxWidth: "100%",
                          boxSizing: "border-box",
                          overflow: "hidden",
                        }}
                      >
                        <strong
                          style={{
                            display: "block",
                            width: "100%",
                            maxWidth: "100%",
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                            boxSizing:
                              "border-box",
                          }}
                        >
                          {matchName}
                        </strong>

                        <span
                          style={{
                            display: "block",
                            width: "100%",
                            maxWidth: "100%",
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {match?.league ||
                            "Futbol"}
                        </span>

                        <small>
                          {date}
                        </small>
                      </div>

                      <div
                        className="my-prediction-value"
                        style={{
                          flex:
                            "0 0 auto",
                          width: "78px",
                          minWidth: "78px",
                          maxWidth: "78px",
                          boxSizing:
                            "border-box",
                          overflow:
                            "hidden",
                          textAlign:
                            "center",
                          display: "flex",
                          flexDirection:
                            "column",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                        }}
                      >
                        <strong
                          style={{
                            display:
                              "block",
                            maxWidth:
                              "100%",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {
                            predictionLabel
                          }
                        </strong>

                        <small
                          style={{
                            display:
                              "block",
                            maxWidth:
                              "100%",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {resultLabel}
                        </small>

                        <small
                          style={{
                            display:
                              "block",
                            maxWidth:
                              "100%",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          +{points} puan
                        </small>
                      </div>
                    </div>
                  );

                  if (match?.id) {
                    return (
                      <Link
                        key={item.id}
                        href={`/mac/${match.id}`}
                        style={{
                          display: "block",
                          width: "100%",
                          maxWidth: "100%",
                          minWidth: 0,
                          boxSizing:
                            "border-box",
                          overflow:
                            "hidden",
                          textDecoration:
                            "none",
                        }}
                      >
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      style={{
                        width: "100%",
                        maxWidth: "100%",
                        minWidth: 0,
                        boxSizing:
                          "border-box",
                        overflow:
                          "hidden",
                      }}
                    >
                      {content}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
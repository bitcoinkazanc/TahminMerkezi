"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ProfileCard from "../../components/ProfileCard";
import ProfileFollowList from "../../components/ProfileFollowList";
import Loading from "../../components/Loading";

export default function ProfilePage() {
  const searchParams =
    useSearchParams();

  const [user, setUser] =
    useState(null);

  const [predictions, setPredictions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [followersCount, setFollowersCount] =
    useState(0);

  const [followingCount, setFollowingCount] =
    useState(0);

  const [followListType, setFollowListType] =
    useState(null);

  const profileUserId =
    searchParams.get("user_id");

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        setUser(null);
        setPredictions([]);
        setFollowersCount(0);
        setFollowingCount(0);

        let profileUser = null;

        /*
         * ==================================================
         * PROFİL KULLANICISINI BUL
         * ==================================================
         */

        if (profileUserId) {
          const response =
            await fetch(
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
            JSON.parse(
              savedUser
            );

          if (!parsedUser?.id) {
            setLoading(false);
            return;
          }

          profileUser =
            parsedUser;
        }

        setUser(profileUser);

        /*
         * ==================================================
         * TAKİPÇİ / TAKİP SAYILARI
         * ==================================================
         */

        try {
          const followResponse =
            await fetch(
              `/api/follows?user_id=${encodeURIComponent(
                profileUser.id
              )}&type=followers`,
              {
                cache: "no-store",
              }
            );

          const followResult =
            await followResponse.json();

          if (
            followResponse.ok &&
            followResult.success
          ) {
            setFollowersCount(
              Array.isArray(
                followResult.users
              )
                ? followResult.users.length
                : 0
            );
          }
        } catch (
          followError
        ) {
          console.error(
            "Followers count error:",
            followError
          );
        }

        try {
          const followingResponse =
            await fetch(
              `/api/follows?user_id=${encodeURIComponent(
                profileUser.id
              )}&type=following`,
              {
                cache: "no-store",
              }
            );

          const followingResult =
            await followingResponse.json();

          if (
            followingResponse.ok &&
            followingResult.success
          ) {
            setFollowingCount(
              Array.isArray(
                followingResult.users
              )
                ? followingResult.users.length
                : 0
            );
          }
        } catch (
          followingError
        ) {
          console.error(
            "Following count error:",
            followingError
          );
        }

        /*
         * ==================================================
         * TAHMİNLER
         * ==================================================
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
            result.predictions ||
              []
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
   * LOADING
   * ==================================================
   */

  if (loading) {
    return <Loading />;
  }

  /*
   * ==================================================
   * ERROR
   * ==================================================
   */

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

  /*
   * ==================================================
   * KULLANICI YOK
   * ==================================================
   */

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
              Profil bilgilerini görmek
              için Telegram üzerinden
              uygulamayı açmalısın.
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
   * TAHMİN İSTATİSTİKLERİ
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
        (Number(item.points) ||
          0),
      0
    );

  return (
    <>
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
          <ProfileCard
            user={user}
          />

          {/*
           * ==================================================
           * TAKİP İSTATİSTİKLERİ
           * ==================================================
           */}

          <section
            className="profile-stats"
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
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

            <button
              type="button"
              className="stat-card"
              onClick={() =>
                setFollowListType(
                  "followers"
                )
              }
              style={{
                border: "none",
                font: "inherit",
                color: "inherit",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <strong>
                {followersCount}
              </strong>

              <span>
                Takipçi
              </span>
            </button>

            <button
              type="button"
              className="stat-card"
              onClick={() =>
                setFollowListType(
                  "following"
                )
              }
              style={{
                border: "none",
                font: "inherit",
                color: "inherit",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <strong>
                {followingCount}
              </strong>

              <span>
                Takip
              </span>
            </button>
          </section>

          {/*
           * ==================================================
           * DİĞER İSTATİSTİKLER
           * ==================================================
           */}

          <section
            className="profile-stats"
            style={{
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
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

            <div className="stat-card">
              <strong>
                {correctPredictions}
              </strong>

              <span>
                Doğru
              </span>
            </div>
          </section>

          {/*
           * ==================================================
           * TAHMİNLER
           * ==================================================
           */}

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
                Daha önce yaptığı
                tahminler.
              </p>
            </div>

            {predictions.length ===
            0 ? (
              <div className="empty-state small">
                <div className="empty-icon">
                  🎯
                </div>

                <h3>
                  Henüz tahmin yok
                </h3>

                <p>
                  Bu kullanıcının
                  henüz yaptığı bir
                  tahmin bulunmuyor.
                </p>
              </div>
            ) : (
              <div
                className="my-predictions"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  boxSizing:
                    "border-box",
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
                          display:
                            "flex",
                          alignItems:
                            "center",
                          width: "100%",
                          maxWidth:
                            "100%",
                          minWidth: 0,
                          boxSizing:
                            "border-box",
                          overflow:
                            "hidden",
                        }}
                      >
                        <div
                          className="my-prediction-info"
                          style={{
                            flex:
                              "1 1 auto",
                            width: 0,
                            minWidth: 0,
                            maxWidth:
                              "100%",
                            boxSizing:
                              "border-box",
                            overflow:
                              "hidden",
                          }}
                        >
                          <strong
                            style={{
                              display:
                                "block",
                              width:
                                "100%",
                              maxWidth:
                                "100%",
                              minWidth: 0,
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {
                              matchName
                            }
                          </strong>

                          <span
                            style={{
                              display:
                                "block",
                              width:
                                "100%",
                              maxWidth:
                                "100%",
                              minWidth: 0,
                              overflow:
                                "hidden",
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
                            width:
                              "78px",
                            minWidth:
                              "78px",
                            maxWidth:
                              "78px",
                            boxSizing:
                              "border-box",
                            overflow:
                              "hidden",
                            textAlign:
                              "center",
                            display:
                              "flex",
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
                            {
                              resultLabel
                            }
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

                    if (
                      match?.id
                    ) {
                      return (
                        <Link
                          key={
                            item.id
                          }
                          href={`/mac/${match.id}`}
                          style={{
                            display:
                              "block",
                            width:
                              "100%",
                            maxWidth:
                              "100%",
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
                        key={
                          item.id
                        }
                        style={{
                          width:
                            "100%",
                          maxWidth:
                            "100%",
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

      {/*
       * ==================================================
       * TAKİPÇİ / TAKİP EDİLEN LİSTESİ
       * ==================================================
       */}

      {followListType ? (
        <ProfileFollowList
          userId={user.id}
          type={
            followListType
          }
          onClose={() =>
            setFollowListType(
              null
            )
          }
        />
      ) : null}
    </>
  );
}
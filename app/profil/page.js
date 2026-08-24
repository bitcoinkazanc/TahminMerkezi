"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ProfileCard from "../../components/ProfileCard";
import Loading from "../../components/Loading";

export default function ProfilePage() {
  const searchParams = useSearchParams();

  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] =
    useState(null);

  const [predictions, setPredictions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [followLoading, setFollowLoading] =
    useState(false);

  const [isFollowing, setIsFollowing] =
    useState(false);

  const [followersCount, setFollowersCount] =
    useState(0);

  const [followingCount, setFollowingCount] =
    useState(0);

  const [error, setError] =
    useState("");

  const profileUserId =
    searchParams.get("user_id");

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

        /*
         * --------------------------------------------------
         * GİRİŞ YAPMIŞ KULLANICI
         * --------------------------------------------------
         */

        let savedCurrentUser = null;

        try {
          const savedUser =
            localStorage.getItem(
              "tm_user"
            );

          if (savedUser) {
            const parsedUser =
              JSON.parse(
                savedUser
              );

            if (
              parsedUser?.id
            ) {
              savedCurrentUser =
                parsedUser;

              setCurrentUser(
                parsedUser
              );
            }
          }
        } catch (
          localStorageError
        ) {
          console.error(
            "Current user parse error:",
            localStorageError
          );
        }

        /*
         * --------------------------------------------------
         * GÖSTERİLECEK PROFİL
         * --------------------------------------------------
         */

        let profileUser = null;

        if (profileUserId) {
          const response =
            await fetch(
              `/api/users/${encodeURIComponent(
                profileUserId
              )}`,
              {
                cache:
                  "no-store",
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
          if (
            !savedCurrentUser
          ) {
            setLoading(false);
            return;
          }

          profileUser =
            savedCurrentUser;
        }

        setUser(
          profileUser
        );

        /*
         * --------------------------------------------------
         * TAHMİNLER
         * --------------------------------------------------
         */

        const predictionResponse =
          await fetch(
            `/api/predictions?user_id=${encodeURIComponent(
              profileUser.id
            )}`,
            {
              cache:
                "no-store",
            }
          );

        const predictionResult =
          await predictionResponse.json();

        if (
          predictionResponse.ok &&
          predictionResult.success
        ) {
          setPredictions(
            predictionResult.predictions ||
              []
          );
        }

        /*
         * --------------------------------------------------
         * TAKİP DURUMU
         * --------------------------------------------------
         *
         * Sadece başka bir kullanıcının
         * profilindeysek kontrol edilir.
         */

        if (
          savedCurrentUser?.id &&
          profileUser?.id &&
          savedCurrentUser.id !==
            profileUser.id
        ) {
          const followResponse =
            await fetch(
              `/api/follows?follower_id=${encodeURIComponent(
                savedCurrentUser.id
              )}&following_id=${encodeURIComponent(
                profileUser.id
              )}`,
              {
                cache:
                  "no-store",
              }
            );

          const followResult =
            await followResponse.json();

          if (
            followResponse.ok &&
            followResult.success
          ) {
            setIsFollowing(
              !!followResult.is_following
            );

            setFollowersCount(
              Number(
                followResult.followers_count
              ) || 0
            );

            setFollowingCount(
              Number(
                followResult.following_count
              ) || 0
            );
          }
        } else if (
          profileUser?.id
        ) {
          /*
           * Kendi profilimizdeysek
           * sadece sayıları göstermek için
           * aynı kullanıcının takip bilgilerini al.
           */

          const followResponse =
            await fetch(
              `/api/follows?follower_id=${encodeURIComponent(
                profileUser.id
              )}&following_id=${encodeURIComponent(
                profileUser.id
              )}`,
              {
                cache:
                  "no-store",
              }
            );

          /*
           * Kendi kendini takip etmeyeceğimiz için
           * bu istek normalde 400 dönebilir.
           *
           * Bu nedenle burada takip sayılarını
           * başka bir endpoint olmadan alamıyoruz.
           *
           * Hata olması durumunda sessizce devam ediyoruz.
           */

          if (
            followResponse.ok
          ) {
            const followResult =
              await followResponse.json();

            if (
              followResult.success
            ) {
              setFollowersCount(
                Number(
                  followResult.followers_count
                ) || 0
              );

              setFollowingCount(
                Number(
                  followResult.following_count
                ) || 0
              );
            }
          }
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
      setFollowLoading(
        true
      );

      if (
        isFollowing
      ) {
        /*
         * --------------------------------------------------
         * TAKİBİ BIRAK
         * --------------------------------------------------
         */

        const response =
          await fetch(
            `/api/follows?follower_id=${encodeURIComponent(
              currentUser.id
            )}&following_id=${encodeURIComponent(
              user.id
            )}`,
            {
              method:
                "DELETE",
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
              "Takip bırakma işlemi başarısız."
          );
        }

        setIsFollowing(
          false
        );

        setFollowersCount(
          (value) =>
            Math.max(
              0,
              value - 1
            )
        );
      } else {
        /*
         * --------------------------------------------------
         * TAKİP ET
         * --------------------------------------------------
         */

        const response =
          await fetch(
            "/api/follows",
            {
              method:
                "POST",
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
              "Takip işlemi başarısız."
          );
        }

        setIsFollowing(
          true
        );

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
          "Takip işlemi sırasında bir hata oluştu."
      );
    } finally {
      setFollowLoading(
        false
      );
    }
  }

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
          overflowX:
            "hidden",
          boxSizing:
            "border-box",
          paddingBottom:
            "100px",
        }}
      >
        <div
          className="page-container"
          style={{
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing:
              "border-box",
          }}
        >
          <div className="error-box">
            <h2>
              Bir sorun oluştu
            </h2>

            <p>
              {error}
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
          overflowX:
            "hidden",
          boxSizing:
            "border-box",
          paddingBottom:
            "100px",
        }}
      >
        <div
          className="page-container"
          style={{
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing:
              "border-box",
          }}
        >
          <div className="empty-state profile-empty">
            <div className="empty-icon">
              👤
            </div>

            <h1>
              Profil
            </h1>

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

  const completedPredictions =
    correctPredictions +
    wrongPredictions;

  const successRate =
    completedPredictions >
    0
      ? Math.round(
          (correctPredictions /
            completedPredictions) *
            100
        )
      : 0;

  const totalPoints =
    predictions.reduce(
      (
        total,
        item
      ) =>
        total +
        (Number(
          item.points
        ) || 0),
      0
    );

  const isOwnProfile =
    currentUser?.id ===
    user?.id;

  /*
   * ==================================================
   * RENDER
   * ==================================================
   */

  return (
    <main
      className="page"
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX:
          "hidden",
        boxSizing:
          "border-box",
        paddingBottom:
          "100px",
      }}
    >
      <div
        className="page-container"
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing:
            "border-box",
          overflowX:
            "hidden",
        }}
      >
        <ProfileCard
          user={user}
        />

        {/*
         * ==================================================
         * TAKİP ALANI
         * ==================================================
         */}

        <section
          className="section-card"
          style={{
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing:
              "border-box",
            overflow:
              "hidden",
            marginTop:
              "12px",
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
              gap:
                "12px",
              width:
                "100%",
              minWidth:
                0,
              boxSizing:
                "border-box",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                gap:
                  "18px",
                minWidth:
                  0,
                flex:
                  "1 1 auto",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  minWidth:
                    0,
                }}
              >
                <strong>
                  {followersCount}
                </strong>

                <span
                  style={{
                    fontSize:
                      "12px",
                    opacity:
                      0.7,
                  }}
                >
                  Takipçi
                </span>
              </div>

              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  minWidth:
                    0,
                }}
              >
                <strong>
                  {followingCount}
                </strong>

                <span
                  style={{
                    fontSize:
                      "12px",
                    opacity:
                      0.7,
                  }}
                >
                  Takip
                </span>
              </div>
            </div>

            {!isOwnProfile &&
              currentUser?.id && (
                <button
                  type="button"
                  onClick={
                    handleFollowToggle
                  }
                  disabled={
                    followLoading
                  }
                  className={
                    isFollowing
                      ? "secondary-button"
                      : "primary-button"
                  }
                  style={{
                    flex:
                      "0 0 auto",
                    minWidth:
                      "110px",
                    whiteSpace:
                      "nowrap",
                    opacity:
                      followLoading
                        ? 0.7
                        : 1,
                  }}
                >
                  {followLoading
                    ? "İşleniyor..."
                    : isFollowing
                    ? "Takibi Bırak"
                    : "Takip Et"}
                </button>
              )}
          </div>
        </section>

        {/*
         * ==================================================
         * PROFİL İSTATİSTİKLERİ
         * ==================================================
         */}

        <section className="profile-stats">
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
            boxSizing:
              "border-box",
            overflow:
              "hidden",
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
                boxSizing:
                  "border-box",
                overflow:
                  "hidden",
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
                        width:
                          "100%",
                        maxWidth:
                          "100%",
                        minWidth:
                          0,
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
                          minWidth:
                            0,
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
                            minWidth:
                              0,
                            overflow:
                              "hidden",
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
                            display:
                              "block",
                            width:
                              "100%",
                            maxWidth:
                              "100%",
                            minWidth:
                              0,
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
                          minWidth:
                            0,
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
                        minWidth:
                          0,
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
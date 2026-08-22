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

  const profileUserId =
    searchParams.get("user_id");

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

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(
              result.error ||
                "Kullanıcı profili alınamadı."
            );
          }

          profileUser = result.user;
        } else {
          const savedUser =
            localStorage.getItem("tm_user");

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

          profileUser = parsedUser;
        }

        setUser(profileUser);

        const response = await fetch(
          `/api/predictions?user_id=${encodeURIComponent(
            profileUser.id
          )}`,
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (response.ok && result.success) {
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

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <main className="page">
        <div className="page-container">
          <div className="error-box">
            <h2>Bir sorun oluştu</h2>

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
      <main className="page">
        <div className="page-container">
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

  return (
    <main className="page">
      <div className="page-container">
        <ProfileCard user={user} />

        <section className="profile-stats">
          <div className="stat-card">
            <strong>
              {predictions.length}
            </strong>

            <span>Toplam Tahmin</span>
          </div>

          <div className="stat-card">
            <strong>—</strong>

            <span>Başarı Oranı</span>
          </div>

          <div className="stat-card">
            <strong>—</strong>

            <span>Puan</span>
          </div>
        </section>

        <section className="section-card">
          <div className="section-title">
            <h2>Tahminlerim</h2>

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
            <div className="my-predictions">
              {predictions.map((item) => {
                const match = item.matches;

                const matchName = match
                  ? `${match.home_team} - ${match.away_team}`
                  : "Maç bilgisi yok";

                const predictionLabel =
                  item.prediction === "MS1"
                    ? "MS 1"
                    : item.prediction === "MSX"
                      ? "MS X"
                      : item.prediction === "MS2"
                        ? "MS 2"
                        : item.prediction;

                const date = item.created_at
                  ? new Date(
                      item.created_at
                    ).toLocaleDateString(
                      "tr-TR"
                    )
                  : "";

                const content = (
                  <div className="my-prediction-item">
                    <div className="my-prediction-info">
                      <strong>
                        {matchName}
                      </strong>

                      <span>
                        {match?.league ||
                          "Futbol"}
                      </span>

                      <small>
                        {date}
                      </small>
                    </div>

                    <div className="my-prediction-value">
                      {predictionLabel}
                    </div>
                  </div>
                );

                if (match?.id) {
                  return (
                    <Link
                      key={item.id}
                      href={`/mac/${match.id}`}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div key={item.id}>
                    {content}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
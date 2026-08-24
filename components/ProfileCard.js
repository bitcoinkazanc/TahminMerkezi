"use client";

import { useEffect, useState } from "react";

export default function ProfileCard({ user }) {
  const [followersCount, setFollowersCount] =
    useState(0);

  const [followingCount, setFollowingCount] =
    useState(0);

  const [loadingFollows, setLoadingFollows] =
    useState(true);

  const [listType, setListType] =
    useState(null);

  if (!user) {
    return (
      <section className="profile-card">
        <div className="profile-avatar-placeholder">
          ?
        </div>

        <div className="profile-info">
          <p>Profil bilgileri yüklenemedi.</p>
        </div>
      </section>
    );
  }

  const avatarLetter = (
    user.first_name ||
    user.username ||
    "T"
  )
    .charAt(0)
    .toUpperCase();

  /*
   * ==================================================
   * TAKİP SAYILARINI AL
   * ==================================================
   */

  useEffect(() => {
    async function loadFollowCounts() {
      if (!user?.id) {
        setLoadingFollows(false);
        return;
      }

      try {
        setLoadingFollows(true);

        /*
         * Kendi profilinde:
         *
         * follower_id = kullanıcı
         * following_id = kullanıcı
         *
         * Mevcut API takip durumunu ve
         * ilgili sayı bilgisini döndürüyor.
         */

        const response =
          await fetch(
            `/api/follows?follower_id=${encodeURIComponent(
              user.id
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
          response.ok &&
          result.success
        ) {
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
        }
      } catch (error) {
        console.error(
          "Follow counts loading error:",
          error
        );
      } finally {
        setLoadingFollows(false);
      }
    }

    loadFollowCounts();
  }, [user?.id]);

  function openTelegram() {
    if (!user.username) {
      return;
    }

    window.open(
      `https://t.me/${user.username}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  /*
   * ==================================================
   * TAKİPÇİ LİSTESİ
   * ==================================================
   */

  function openFollowers() {
    setListType("followers");
  }

  /*
   * ==================================================
   * TAKİP EDİLENLER LİSTESİ
   * ==================================================
   */

  function openFollowing() {
    setListType("following");
  }

  function closeList() {
    setListType(null);
  }

  return (
    <>
      <section
        className="profile-card"
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={
              user.username
                ? `@${user.username}`
                : "Telegram Kullanıcısı"
            }
            className="profile-avatar"
            width={72}
            height={72}
            style={{
              width: "72px",
              height: "72px",
              minWidth: "72px",
              minHeight: "72px",
              maxWidth: "72px",
              maxHeight: "72px",
              objectFit: "cover",
              borderRadius: "50%",
              display: "block",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            className="profile-avatar-placeholder"
            style={{
              flexShrink: 0,
            }}
          >
            {avatarLetter}
          </div>
        )}

        <div
          className="profile-info"
          style={{
            flex: "1 1 auto",
            width: 0,
            minWidth: 0,
            maxWidth: "100%",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
              boxSizing: "border-box",
            }}
          >
            {user.username ? (
              <p
                style={{
                  flex: "1 1 auto",
                  width: 0,
                  minWidth: 0,
                  maxWidth: "100%",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                @{user.username}
              </p>
            ) : (
              <p
                style={{
                  flex: "1 1 auto",
                  width: 0,
                  minWidth: 0,
                  maxWidth: "100%",
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Telegram kullanıcısı
              </p>
            )}

            {user.username ? (
              <button
                type="button"
                onClick={openTelegram}
                style={{
                  flex: "0 0 auto",
                  flexShrink: 0,
                  padding: "6px 10px",
                  minHeight: "30px",
                  border: "none",
                  borderRadius: "8px",
                  background: "var(--primary)",
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: 800,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                💬 Mesaj
              </button>
            ) : null}
          </div>

          {/* ==================================================
              TAKİP İSTATİSTİKLERİ
              ================================================== */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              marginTop: "10px",
            }}
          >
            <button
              type="button"
              onClick={openFollowers}
              style={{
                border: "none",
                padding: 0,
                margin: 0,
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <strong
                style={{
                  display: "block",
                  fontSize: "15px",
                  lineHeight: "1.2",
                }}
              >
                {loadingFollows
                  ? "..."
                  : followersCount}
              </strong>

              <span
                style={{
                  display: "block",
                  marginTop: "2px",
                  fontSize: "11px",
                  opacity: 0.7,
                }}
              >
                Takipçi
              </span>
            </button>

            <button
              type="button"
              onClick={openFollowing}
              style={{
                border: "none",
                padding: 0,
                margin: 0,
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <strong
                style={{
                  display: "block",
                  fontSize: "15px",
                  lineHeight: "1.2",
                }}
              >
                {loadingFollows
                  ? "..."
                  : followingCount}
              </strong>

              <span
                style={{
                  display: "block",
                  marginTop: "2px",
                  fontSize: "11px",
                  opacity: 0.7,
                }}
              >
                Takip
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ==================================================
          TAKİPÇİ / TAKİP EDİLEN PENCERESİ
          ================================================== */}

      {listType ? (
        <div
          onClick={closeList}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background:
              "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "520px",
              maxHeight: "75vh",
              background:
                "var(--background, #fff)",
              borderRadius:
                "18px 18px 0 0",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                padding: "16px",
                borderBottom:
                  "1px solid rgba(128,128,128,0.2)",
              }}
            >
              <strong>
                {listType ===
                "followers"
                  ? "Takipçiler"
                  : "Takip Ettikleri"}
              </strong>

              <button
                type="button"
                onClick={closeList}
                style={{
                  border: "none",
                  background:
                    "transparent",
                  fontSize: "22px",
                  cursor: "pointer",
                  color: "inherit",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                opacity: 0.7,
              }}
            >
              <div
                style={{
                  fontSize: "32px",
                  marginBottom: "8px",
                }}
              >
                👥
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                }}
              >
                {listType ===
                "followers"
                  ? "Takipçi listesi"
                  : "Takip edilen kullanıcılar"}
              </p>

              <small
                style={{
                  display: "block",
                  marginTop: "6px",
                  opacity: 0.7,
                }}
              >
                Liste bağlantısı bir sonraki
                adımda eklenecek.
              </small>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
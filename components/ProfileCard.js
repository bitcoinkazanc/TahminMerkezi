"use client";

import { useState } from "react";
import ProfileFollowList from "./ProfileFollowList";

export default function ProfileCard({ user }) {
  const [followList, setFollowList] = useState(null);

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

  const followersCount =
    Number(user.followers_count) || 0;

  const followingCount =
    Number(user.following_count) || 0;

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
              {user.username
                ? `@${user.username}`
                : "Telegram kullanıcısı"}
            </p>

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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "8px",
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            <button
              type="button"
              onClick={() => setFollowList("followers")}
              style={{
                border: "none",
                background: "transparent",
                padding: "2px 5px",
                margin: 0,
                cursor: "pointer",
                fontSize: "11px",
                lineHeight: 1.2,
                color: "inherit",
                display: "flex",
                alignItems: "center",
                gap: "3px",
                whiteSpace: "nowrap",
              }}
            >
              <strong>{followersCount}</strong>
              <span>Takipçi</span>
            </button>

            <button
              type="button"
              onClick={() => setFollowList("following")}
              style={{
                border: "none",
                background: "transparent",
                padding: "2px 5px",
                margin: 0,
                cursor: "pointer",
                fontSize: "11px",
                lineHeight: 1.2,
                color: "inherit",
                display: "flex",
                alignItems: "center",
                gap: "3px",
                whiteSpace: "nowrap",
              }}
            >
              <strong>{followingCount}</strong>
              <span>Takip</span>
            </button>
          </div>
        </div>
      </section>

      {followList ? (
        <ProfileFollowList
          userId={user.id}
          type={followList}
          onClose={() => setFollowList(null)}
        />
      ) : null}
    </>
  );
}
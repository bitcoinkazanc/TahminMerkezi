"use client";

export default function ProfileCard({ user }) {
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

  return (
    <section className="profile-card">
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
          }}
        />
      ) : (
        <div className="profile-avatar-placeholder">
          {avatarLetter}
        </div>
      )}

      <div
        className="profile-info"
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            width: "100%",
          }}
        >
          {user.username ? (
            <p
              style={{
                margin: 0,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              @{user.username}
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              Telegram kullanıcısı
            </p>
          )}

          {user.username ? (
            <button
              type="button"
              onClick={openTelegram}
              style={{
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
      </div>
    </section>
  );
}
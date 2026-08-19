"use client";

export default function ProfileCard({ user }) {
  if (!user) {
    return (
      <section className="profile-card">
        <div className="profile-avatar-placeholder">
          ?
        </div>

        <div className="profile-info">
          <h2>Telegram Kullanıcısı</h2>

          <p>
            Profil bilgileri yüklenemedi.
          </p>
        </div>
      </section>
    );
  }

  const displayName =
    [user.first_name, user.last_name]
      .filter(Boolean)
      .join(" ") ||
    user.username ||
    "Telegram Kullanıcısı";

  const avatarLetter = (
    user.first_name ||
    user.username ||
    "T"
  )
    .charAt(0)
    .toUpperCase();

  return (
    <section className="profile-card">
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={displayName}
          className="profile-avatar"
        />
      ) : (
        <div className="profile-avatar-placeholder">
          {avatarLetter}
        </div>
      )}

      <div className="profile-info">
        <h2>{displayName}</h2>

        {user.username ? (
          <p>@{user.username}</p>
        ) : (
          <p>Telegram kullanıcısı</p>
        )}
      </div>
    </section>
  );
}
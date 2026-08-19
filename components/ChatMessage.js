"use client";

export default function ChatMessage({ message }) {
  const user = message?.users;

  const name =
    [user?.first_name, user?.last_name]
      .filter(Boolean)
      .join(" ") ||
    user?.username ||
    "Telegram Kullanıcısı";

  const avatarLetter = (
    user?.first_name ||
    user?.username ||
    "T"
  )
    .charAt(0)
    .toUpperCase();

  const date = message?.created_at
    ? new Date(message.created_at)
    : null;

  const formattedTime =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  let currentUserId = null;

  if (typeof window !== "undefined") {
    try {
      const savedUser = localStorage.getItem("tm_user");

      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        currentUserId = parsedUser?.id || null;
      }
    } catch {
      currentUserId = null;
    }
  }

  const isMine =
    currentUserId && user?.id
      ? currentUserId === user.id
      : false;

  return (
    <div
      className={`chat-message ${
        isMine ? "mine" : ""
      }`}
    >
      {user?.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={name}
          className="user-avatar"
        />
      ) : (
        <div className="user-avatar-placeholder">
          {avatarLetter}
        </div>
      )}

      <div className="chat-message-body">
        {!isMine ? (
          <div className="chat-message-name">
            {name}
          </div>
        ) : null}

        <p className="chat-message-text">
          {message?.content || ""}
        </p>

        {formattedTime ? (
          <span className="chat-message-time">
            {formattedTime}
          </span>
        ) : null}
      </div>
    </div>
  );
}
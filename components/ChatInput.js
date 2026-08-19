"use client";

import { useState } from "react";

export default function ChatInput({
  matchId = null,
  onMessageCreated,
}) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    const text = content.trim();

    if (!text || sending) {
      return;
    }

    try {
      setSending(true);
      setError("");

      const savedUser = localStorage.getItem("tm_user");

      if (!savedUser) {
        setError(
          "Mesaj göndermek için Telegram üzerinden giriş yapmalısın."
        );
        return;
      }

      const user = JSON.parse(savedUser);

      if (!user?.id) {
        setError("Kullanıcı bilgisi bulunamadı.");
        return;
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          match_id: matchId,
          content: text,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Mesaj gönderilemedi."
        );
      }

      setContent("");

      if (onMessageCreated) {
        onMessageCreated(result.message);
      }
    } catch (err) {
      console.error("Chat message error:", err);

      setError(
        err.message ||
          "Mesaj gönderilirken bir hata oluştu."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <textarea
        value={content}
        onChange={(event) =>
          setContent(event.target.value)
        }
        placeholder="Mesajını yaz..."
        maxLength={1000}
        rows={1}
        disabled={sending}
      />

      <button
        type="submit"
        className="chat-send-button"
        disabled={
          sending || !content.trim()
        }
        aria-label="Mesaj gönder"
      >
        {sending ? "…" : "➤"}
      </button>

      {error ? (
        <div className="chat-input-error">
          {error}
        </div>
      ) : null}
    </form>
  );
}
"use client";

import { useEffect, useState } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import Loading from "./Loading";

export default function ChatBox({ matchId = null }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadMessages() {
    try {
      setLoading(true);

      const query = matchId
        ? `/api/messages?match_id=${encodeURIComponent(
            matchId
          )}&limit=100`
        : "/api/messages?limit=100";

      const response = await fetch(query, {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Mesajlar alınamadı."
        );
      }

      setMessages(result.messages || []);
    } catch (error) {
      console.error(
        "Chat loading error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
  }, [matchId]);

  function handleMessageCreated(newMessage) {
    if (!newMessage) return;

    setMessages((current) => {
      const exists = current.some(
        (message) =>
          String(message.id) ===
          String(newMessage.id)
      );

      if (exists) {
        return current;
      }

      return [
        ...current,
        newMessage,
      ];
    });
  }

  return (
    <div className="chat-box">
      <ChatInput
        matchId={matchId}
        onMessageCreated={
          handleMessageCreated
        }
      />

      {loading ? (
        <Loading />
      ) : messages.length === 0 ? (
        <div className="empty-state small">
          <div className="empty-icon">
            💬
          </div>

          <p>
            Henüz mesaj yok. Sohbeti ilk sen başlat!
          </p>
        </div>
      ) : (
        <div className="chat-messages">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
            />
          ))}
        </div>
      )}
    </div>
  );
}
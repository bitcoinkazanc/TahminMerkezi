"use client";

import { useEffect, useState } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import Loading from "./Loading";
import { supabase } from "../lib/supabase-client";

export default function ChatBox({ matchId = null }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  /*
   * ==================================================
   * MESAJLARI API'DEN YÜKLE
   * ==================================================
   */

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

  /*
   * ==================================================
   * İLK YÜKLEME
   * ==================================================
   */

  useEffect(() => {
    loadMessages();
  }, [matchId]);

  /*
   * ==================================================
   * SUPABASE REALTIME
   * ==================================================
   *
   * Yeni mesaj geldiğinde diğer telefonlarda
   * sayfa yenilenmeden anında gösterilir.
   */

  useEffect(() => {
    let channel = null;

    async function startRealtime() {
      try {
        /*
         * Eski bağlantı varsa önce temizle.
         */

        channel =
          supabase
            .channel(
              matchId
                ? `chat-match-${matchId}`
                : "chat-global"
            )
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "messages",
                ...(matchId
                  ? {
                      filter: `match_id=eq.${matchId}`,
                    }
                  : {}),
              },
              async (payload) => {
                try {
                  const newMessage =
                    payload?.new;

                  if (!newMessage) {
                    return;
                  }

                  /*
                   * Realtime mesajında users bilgisi
                   * gelmez.
                   *
                   * Bu nedenle API'den mesajı tekrar
                   * çekiyoruz. Böylece kullanıcı adı,
                   * avatar vb. bilgiler de gelir.
                   */

                  const response =
                    await fetch(
                      `/api/messages?match_id=${encodeURIComponent(
                        newMessage.match_id
                      )}&limit=100`,
                      {
                        cache:
                          "no-store",
                      }
                    );

                  if (
                    !response.ok
                  ) {
                    return;
                  }

                  const result =
                    await response.json();

                  if (
                    !result?.success ||
                    !Array.isArray(
                      result.messages
                    )
                  ) {
                    return;
                  }

                  const freshMessage =
                    result.messages.find(
                      (message) =>
                        String(
                          message.id
                        ) ===
                        String(
                          newMessage.id
                        )
                    );

                  if (
                    !freshMessage
                  ) {
                    return;
                  }

                  /*
                   * Mesaj zaten ekrandaysa
                   * ikinci kez ekleme.
                   */

                  setMessages(
                    (current) => {
                      const exists =
                        current.some(
                          (message) =>
                            String(
                              message.id
                            ) ===
                            String(
                              freshMessage.id
                            )
                        );

                      if (
                        exists
                      ) {
                        return current;
                      }

                      return [
                        ...current,
                        freshMessage,
                      ];
                    }
                  );
                } catch (error) {
                  console.error(
                    "Realtime message handling error:",
                    error
                  );
                }
              }
            )
            .subscribe(
              (status) => {
                console.log(
                  "Chat realtime status:",
                  status
                );
              }
            );
        } catch (error) {
        console.error(
          "Chat realtime connection error:",
          error
        );
      }
    }

    startRealtime();

    /*
     * ==================================================
     * TEMİZLEME
     * ==================================================
     */

    return () => {
      if (channel) {
        supabase.removeChannel(
          channel
        );
        channel = null;
      }
    };
  }, [matchId]);

  /*
   * ==================================================
   * YENİ MESAJ OLUŞTU
   * ==================================================
   *
   * Mesajı gönderen kullanıcının ekranında
   * API cevabıyla anında gösterilir.
   */

  function handleMessageCreated(
    newMessage
  ) {
    if (!newMessage) {
      return;
    }

    setMessages(
      (current) => {
        const exists =
          current.some(
            (message) =>
              String(
                message.id
              ) ===
              String(
                newMessage.id
              )
          );

        if (exists) {
          return current;
        }

        return [
          ...current,
          newMessage,
        ];
      }
    );
  }

  /*
   * ==================================================
   * EKRAN
   * ==================================================
   */

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
          {messages.map(
            (message) => (
              <ChatMessage
                key={
                  message.id
                }
                message={
                  message
                }
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
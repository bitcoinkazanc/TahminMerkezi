"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import Loading from "./Loading";

/*
 * ==================================================
 * SUPABASE CLIENT
 * ==================================================
 */

function getSupabaseClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error(
      "Supabase Realtime environment variables missing."
    );

    return null;
  }

  return createClient(
    url,
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/*
 * ==================================================
 * MESAJ SESİ
 * ==================================================
 */

function playMessageSound() {
  try {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContext) {
      return;
    }

    const audioContext =
      new AudioContext();

    const oscillator =
      audioContext.createOscillator();

    const gainNode =
      audioContext.createGain();

    oscillator.type =
      "sine";

    oscillator.frequency.setValueAtTime(
      880,
      audioContext.currentTime
    );

    oscillator.frequency.exponentialRampToValueAtTime(
      660,
      audioContext.currentTime +
        0.08
    );

    gainNode.gain.setValueAtTime(
      0.0001,
      audioContext.currentTime
    );

    gainNode.gain.exponentialRampToValueAtTime(
      0.08,
      audioContext.currentTime +
        0.01
    );

    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime +
        0.12
    );

    oscillator.connect(
      gainNode
    );

    gainNode.connect(
      audioContext.destination
    );

    oscillator.start();

    oscillator.stop(
      audioContext.currentTime +
        0.12
    );

    oscillator.addEventListener(
      "ended",
      () => {
        audioContext
          .close()
          .catch(
            () => {}
          );
      }
    );
  } catch (error) {
    console.warn(
      "Message sound error:",
      error
    );
  }
}

/*
 * ==================================================
 * CHAT BOX
 * ==================================================
 */

export default function ChatBox({
  matchId = null,
}) {
  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  /*
   * Realtime tarafından gelen aynı mesajın
   * tekrar eklenmesini önlemek için.
   */

  const processedMessageIds =
    useRef(new Set());

  /*
   * Kendi gönderdiğimiz mesajları takip etmek
   * için kullanılır.
   *
   * Böylece kendi mesajımız Realtime'dan
   * tekrar geldiğinde bip sesi çalmaz.
   */

  const ownMessageIds =
    useRef(new Set());

  /*
   * ==================================================
   * MESAJLARI YÜKLE
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

      const response =
        await fetch(
          query,
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
            "Mesajlar alınamadı."
        );
      }

      const loadedMessages =
        result.messages || [];

      /*
       * Daha önce yüklenen mesajların ID'lerini
       * kaydet.
       */

      processedMessageIds.current =
        new Set(
          loadedMessages
            .map(
              (message) =>
                message?.id
            )
            .filter(Boolean)
            .map(
              (id) =>
                String(id)
            )
        );

      setMessages(
        loadedMessages
      );
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
   * İLK MESAJLARI YÜKLE
   * ==================================================
   */

  useEffect(() => {
    loadMessages();
  }, [matchId]);

  /*
   * ==================================================
   * REALTIME
   * ==================================================
   */

  useEffect(() => {
    /*
     * Global sohbet veya maç sohbeti.
     */

    const supabase =
      getSupabaseClient();

    if (!supabase) {
      return;
    }

    /*
     * Component yeniden oluştuğunda eski
     * ID listelerini temizle.
     */

    processedMessageIds.current =
      new Set();

    ownMessageIds.current =
      new Set();

    /*
     * Benzersiz kanal adı.
     */

    const channelName =
      matchId
        ? `chat-match-${String(
            matchId
          )}`
        : "chat-global";

    console.log(
      "Chat Realtime connecting:",
      channelName
    );

    let channel =
      supabase.channel(
        channelName
      );

    /*
     * --------------------------------------------------
     * YENİ MESAJLARI DİNLE
     * --------------------------------------------------
     */

    channel =
      channel.on(
        "postgres_changes",
        {
          event:
            "INSERT",

          schema:
            "public",

          table:
            "messages",

          ...(matchId
            ? {
                filter:
                  `match_id=eq.${matchId}`,
              }
            : {}),
        },
        async (
          payload
        ) => {
          try {
            const newMessage =
              payload?.new;

            if (
              !newMessage ||
              !newMessage.id
            ) {
              return;
            }

            const messageId =
              String(
                newMessage.id
              );

            /*
             * Aynı mesaj daha önce işlendi mi?
             */

            if (
              processedMessageIds.current.has(
                messageId
              )
            ) {
              return;
            }

            /*
             * Güvenlik amacıyla match_id
             * tekrar kontrol ediliyor.
             */

            if (matchId) {
              if (
                String(
                  newMessage.match_id
                ) !==
                String(
                  matchId
                )
              ) {
                return;
              }
            }

            /*
             * Önce işlendi olarak işaretle.
             */

            processedMessageIds.current.add(
              messageId
            );

            /*
             * --------------------------------------------------
             * MESAJI KULLANICI BİLGİLERİYLE AL
             * --------------------------------------------------
             *
             * Realtime payload'ında users ilişkisi
             * bulunmaz.
             *
             * Bu nedenle API'den tekrar çekiyoruz.
             */

            const query =
              matchId
                ? `/api/messages?match_id=${encodeURIComponent(
                    matchId
                  )}&limit=100`
                : "/api/messages?limit=100";

            const response =
              await fetch(
                query,
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
                  "Yeni mesaj alınamadı."
              );
            }

            const foundMessage =
              (
                result.messages ||
                []
              ).find(
                (message) =>
                  String(
                    message?.id
                  ) ===
                  messageId
              );

            if (
              !foundMessage
            ) {
              return;
            }

            /*
             * --------------------------------------------------
             * MESAJI EKRANA EKLE
             * --------------------------------------------------
             */

            setMessages(
              (current) => {
                const exists =
                  current.some(
                    (
                      message
                    ) =>
                      String(
                        message?.id
                      ) ===
                      messageId
                  );

                if (
                  exists
                ) {
                  return current;
                }

                return [
                  foundMessage,
                  ...current,
                ];
              }
            );

            /*
             * --------------------------------------------------
             * SES
             * --------------------------------------------------
             *
             * Kendi mesajımız değilse ses çal.
             */

            const isOwnMessage =
              ownMessageIds.current.has(
                messageId
              );

            if (
              isOwnMessage
            ) {
              ownMessageIds.current.delete(
                messageId
              );

              return;
            }

            playMessageSound();
          } catch (error) {
            console.error(
              "Realtime message handling error:",
              error
            );
          }
        }
      );

    /*
     * --------------------------------------------------
     * SUBSCRIBE
     * --------------------------------------------------
     */

    channel.subscribe(
      (status) => {
        console.log(
          "Chat Realtime status:",
          status
        );

        if (
          status ===
          "SUBSCRIBED"
        ) {
          console.log(
            "Chat Realtime aktif:",
            channelName
          );
        }

        if (
          status ===
          "CHANNEL_ERROR"
        ) {
          console.error(
            "Chat Realtime channel error:",
            channelName
          );
        }

        if (
          status ===
          "TIMED_OUT"
        ) {
          console.error(
            "Chat Realtime timeout:",
            channelName
          );
        }
      }
    );

    /*
     * --------------------------------------------------
     * CLEANUP
     * --------------------------------------------------
     */

    return () => {
      console.log(
        "Chat Realtime disconnect:",
        channelName
      );

      supabase.removeChannel(
        channel
      );
    };
  }, [matchId]);

  /*
   * ==================================================
   * API'DEN MESAJ GELDİ
   * ==================================================
   */

  function handleMessageCreated(
    newMessage
  ) {
    if (!newMessage) {
      return;
    }

    const messageId =
      newMessage?.id
        ? String(
            newMessage.id
          )
        : null;

    /*
     * Kendi gönderdiğimiz mesajı
     * Realtime'dan ayırt etmek için kaydet.
     */

    if (messageId) {
      ownMessageIds.current.add(
        messageId
      );

      processedMessageIds.current.add(
        messageId
      );
    }

    /*
     * Mesajı hemen kendi ekranımıza ekle.
     */

    setMessages(
      (current) => {
        const exists =
          current.some(
            (
              message
            ) =>
              String(
                message?.id
              ) ===
              messageId
          );

        if (
          exists
        ) {
          return current;
        }

        return [
          newMessage,
          ...current,
        ];
      }
    );
  }

  /*
   * ==================================================
   * RENDER
   * ==================================================
   */

  return (
    <div className="chat-box">
      <ChatInput
        matchId={
          matchId
        }
        onMessageCreated={
          handleMessageCreated
        }
      />

      {loading ? (
        <Loading />
      ) : messages.length ===
        0 ? (
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
            (
              message
            ) => (
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
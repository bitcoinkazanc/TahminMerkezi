"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProfileFollowList({
  userId,
  type,
  onClose,
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadUsers() {
      if (!userId || !type) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `/api/follows?user_id=${encodeURIComponent(
              userId
            )}&type=${encodeURIComponent(
              type
            )}`,
            {
              cache: "no-store",
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
              "Kullanıcı listesi alınamadı."
          );
        }

        setUsers(
          Array.isArray(
            result.users
          )
            ? result.users
            : []
        );
      } catch (error) {
        console.error(
          "Profile follow list error:",
          error
        );

        setError(
          error.message ||
            "Kullanıcı listesi yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [userId, type]);

  const title =
    type === "followers"
      ? "Takipçiler"
      : "Takip Ettikleri";

  return (
    <div
      onClick={onClose}
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
          color:
            "var(--foreground, #111)",
          borderRadius:
            "18px 18px 0 0",
          overflow: "hidden",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* BAŞLIK */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            padding: "16px",
            borderBottom:
              "1px solid rgba(128,128,128,0.2)",
            flexShrink: 0,
          }}
        >
          <strong
            style={{
              fontSize: "16px",
            }}
          >
            {title}
          </strong>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background:
                "transparent",
              color: "inherit",
              fontSize: "24px",
              lineHeight: 1,
              cursor: "pointer",
              padding: "2px 6px",
            }}
          >
            ×
          </button>
        </div>

        {/* İÇERİK */}

        <div
          style={{
            overflowY: "auto",
            flex: "1 1 auto",
            minHeight: 0,
          }}
        >
          {/* YÜKLENİYOR */}

          {loading ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                opacity: 0.7,
              }}
            >
              <div
                style={{
                  fontSize: "28px",
                  marginBottom: "10px",
                }}
              >
                ⏳
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                }}
              >
                Liste yükleniyor...
              </p>
            </div>
          ) : null}

          {/* HATA */}

          {!loading && error ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "28px",
                  marginBottom: "10px",
                }}
              >
                ⚠️
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                }}
              >
                {error}
              </p>
            </div>
          ) : null}

          {/* BOŞ LİSTE */}

          {!loading &&
          !error &&
          users.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                opacity: 0.7,
              }}
            >
              <div
                style={{
                  fontSize: "32px",
                  marginBottom: "10px",
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
                {type ===
                "followers"
                  ? "Henüz takipçi yok."
                  : "Henüz takip edilen kullanıcı yok."}
              </p>
            </div>
          ) : null}

          {/* KULLANICILAR */}

          {!loading &&
          !error &&
          users.length > 0 ? (
            <div
              style={{
                width: "100%",
              }}
            >
              {users.map(
                (item) => {
                  const name =
                    [
                      item.first_name,
                      item.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ") ||
                    item.username ||
                    "Telegram Kullanıcısı";

                  const avatarLetter =
                    (
                      item.first_name ||
                      item.username ||
                      "T"
                    )
                      .charAt(0)
                      .toUpperCase();

                  return (
                    <Link
                      key={item.id}
                      href={`/profil?user_id=${encodeURIComponent(
                        item.id
                      )}`}
                      onClick={
                        onClose
                      }
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: "12px",
                        width: "100%",
                        padding:
                          "12px 16px",
                        boxSizing:
                          "border-box",
                        textDecoration:
                          "none",
                        color:
                          "inherit",
                        borderBottom:
                          "1px solid rgba(128,128,128,0.12)",
                      }}
                    >
                      {/* AVATAR */}

                      {item.avatar_url ? (
                        <img
                          src={
                            item.avatar_url
                          }
                          alt={
                            name
                          }
                          width={44}
                          height={44}
                          style={{
                            width:
                              "44px",
                            height:
                              "44px",
                            minWidth:
                              "44px",
                            borderRadius:
                              "50%",
                            objectFit:
                              "cover",
                            display:
                              "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width:
                              "44px",
                            height:
                              "44px",
                            minWidth:
                              "44px",
                            borderRadius:
                              "50%",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            background:
                              "var(--primary, #2563eb)",
                            color:
                              "#fff",
                            fontWeight:
                              800,
                            fontSize:
                              "16px",
                          }}
                        >
                          {
                            avatarLetter
                          }
                        </div>
                      )}

                      {/* BİLGİ */}

                      <div
                        style={{
                          minWidth: 0,
                          flex:
                            "1 1 auto",
                          overflow:
                            "hidden",
                        }}
                      >
                        <strong
                          style={{
                            display:
                              "block",
                            fontSize:
                              "14px",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {name}
                        </strong>

                        {item.username ? (
                          <span
                            style={{
                              display:
                                "block",
                              marginTop:
                                "3px",
                              fontSize:
                                "11px",
                              opacity:
                                0.65,
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            @
                            {
                              item.username
                            }
                          </span>
                        ) : null}
                      </div>

                      {/* OK */}

                      <span
                        style={{
                          flex:
                            "0 0 auto",
                          fontSize:
                            "18px",
                          opacity:
                            0.45,
                        }}
                      >
                        ›
                      </span>
                    </Link>
                  );
                }
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
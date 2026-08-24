"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProfileCard({ user }) {
  const [followersCount, setFollowersCount] =
    useState(0);

  const [followingCount, setFollowingCount] =
    useState(0);

  const [isFollowing, setIsFollowing] =
    useState(false);

  const [followLoading, setFollowLoading] =
    useState(false);

  const [followList, setFollowList] =
    useState(null);

  const [listLoading, setListLoading] =
    useState(false);

  const [currentUserId, setCurrentUserId] =
    useState(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    async function loadFollowData() {
      try {
        let loggedUserId = null;

        const savedUser =
          localStorage.getItem("tm_user");

        if (savedUser) {
          try {
            loggedUserId =
              JSON.parse(savedUser)?.id ||
              null;
          } catch {
            loggedUserId = null;
          }
        }

        setCurrentUserId(loggedUserId);

        const followerId =
          loggedUserId || user.id;

        const response = await fetch(
          `/api/follows?follower_id=${encodeURIComponent(
            followerId
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

          if (
            loggedUserId &&
            loggedUserId !== user.id
          ) {
            setIsFollowing(
              !!result.is_following
            );
          }
        }
      } catch (error) {
        console.error(
          "Follow data loading error:",
          error
        );
      }
    }

    loadFollowData();
  }, [user?.id]);

  if (!user) {
    return (
      <section className="profile-card">
        <div className="profile-avatar-placeholder">
          ?
        </div>

        <div className="profile-info">
          <p>
            Profil bilgileri yüklenemedi.
          </p>
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

  async function toggleFollow() {
    if (
      followLoading ||
      !user.id ||
      !currentUserId ||
      currentUserId === user.id
    ) {
      return;
    }

    try {
      setFollowLoading(true);

      if (isFollowing) {
        const response =
          await fetch(
            `/api/follows?follower_id=${encodeURIComponent(
              currentUserId
            )}&following_id=${encodeURIComponent(
              user.id
            )}`,
            {
              method: "DELETE",
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
              "Takipten çıkılamadı."
          );
        }

        setIsFollowing(false);

        setFollowersCount(
          (count) =>
            Math.max(0, count - 1)
        );
      } else {
        const response =
          await fetch(
            "/api/follows",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                follower_id:
                  currentUserId,
                following_id:
                  user.id,
              }),
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
              "Takip edilemedi."
          );
        }

        setIsFollowing(true);

        setFollowersCount(
          (count) => count + 1
        );
      }
    } catch (error) {
      console.error(
        "Follow toggle error:",
        error
      );

      alert(
        error.message ||
          "Takip işlemi sırasında bir hata oluştu."
      );
    } finally {
      setFollowLoading(false);
    }
  }

  async function openFollowList(type) {
    if (!user?.id) {
      return;
    }

    try {
      setListLoading(true);

      const response =
        await fetch(
          `/api/follows?user_id=${encodeURIComponent(
            user.id
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
            "Takip listesi alınamadı."
        );
      }

      setFollowList({
        type,
        users:
          result.users || [],
      });
    } catch (error) {
      console.error(
        "Follow list loading error:",
        error
      );

      setFollowList({
        type,
        users: [],
        error:
          error.message ||
          "Liste yüklenemedi.",
      });
    } finally {
      setListLoading(false);
    }
  }

  function closeFollowList() {
    setFollowList(null);
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
          display: "flex",
          alignItems: "center",
          gap: "10px",
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
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <p
            style={{
              margin: 0,
              width: "100%",
              overflow: "hidden",
              textOverflow:
                "ellipsis",
              whiteSpace:
                "nowrap",
            }}
          >
            {user.username
              ? `@${user.username}`
              : "Telegram kullanıcısı"}
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginTop: "9px",
            }}
          >
            <button
              type="button"
              onClick={() =>
                openFollowList(
                  "followers"
                )
              }
              style={{
                border: "none",
                background:
                  "transparent",
                padding: 0,
                margin: 0,
                cursor: "pointer",
                color:
                  "inherit",
                textAlign: "left",
              }}
            >
              <strong
                style={{
                  display:
                    "block",
                  fontSize:
                    "14px",
                  lineHeight:
                    "16px",
                }}
              >
                {followersCount}
              </strong>

              <span
                style={{
                  display:
                    "block",
                  fontSize:
                    "10px",
                  opacity:
                    0.65,
                  lineHeight:
                    "12px",
                }}
              >
                Takipçi
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                openFollowList(
                  "following"
                )
              }
              style={{
                border: "none",
                background:
                  "transparent",
                padding: 0,
                margin: 0,
                cursor: "pointer",
                color:
                  "inherit",
                textAlign: "left",
              }}
            >
              <strong
                style={{
                  display:
                    "block",
                  fontSize:
                    "14px",
                  lineHeight:
                    "16px",
                }}
              >
                {followingCount}
              </strong>

              <span
                style={{
                  display:
                    "block",
                  fontSize:
                    "10px",
                  opacity:
                    0.65,
                  lineHeight:
                    "12px",
                }}
              >
                Takip
              </span>
            </button>
          </div>
        </div>

        <div
          style={{
            flex: "0 0 92px",
            width: "92px",
            minWidth: "92px",
            maxWidth: "92px",
            marginLeft: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            justifyContent: "center",
            gap: "7px",
            boxSizing: "border-box",
          }}
        >
          {user.username &&
          currentUserId !== user.id ? (
            <button
              type="button"
              onClick={
                openTelegram
              }
              style={{
                width: "92px",
                minWidth: "92px",
                maxWidth: "92px",
                height: "30px",
                padding:
                  "0 8px",
                margin: 0,
                border: "none",
                borderRadius:
                  "8px",
                background:
                  "var(--primary)",
                color: "#fff",
                fontSize:
                  "10px",
                fontWeight: 800,
                cursor:
                  "pointer",
                whiteSpace:
                  "nowrap",
                boxSizing:
                  "border-box",
              }}
            >
              💬 Mesaj
            </button>
          ) : null}

          {currentUserId &&
          currentUserId !== user.id ? (
            <button
              type="button"
              onClick={
                toggleFollow
              }
              disabled={
                followLoading
              }
              style={{
                width: "92px",
                minWidth: "92px",
                maxWidth: "92px",
                height: "30px",
                padding:
                  "0 8px",
                margin: 0,
                border: "none",
                borderRadius:
                  "8px",
                background:
                  isFollowing
                    ? "rgba(128,128,128,0.15)"
                    : "var(--primary)",
                color:
                  isFollowing
                    ? "inherit"
                    : "#fff",
                fontSize:
                  "10px",
                fontWeight: 800,
                cursor:
                  followLoading
                    ? "default"
                    : "pointer",
                opacity:
                  followLoading
                    ? 0.6
                    : 1,
                whiteSpace:
                  "nowrap",
                boxSizing:
                  "border-box",
              }}
            >
              {followLoading
                ? "..."
                : isFollowing
                  ? "Takipten Çık"
                  : "Takip Et"}
            </button>
          ) : null}
        </div>
      </section>

      {followList ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background:
              "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems:
              "flex-end",
            justifyContent:
              "center",
          }}
          onClick={
            closeFollowList
          }
        >
          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth:
                "520px",
              maxHeight:
                "80vh",
              background:
                "var(--background, #fff)",
              color:
                "var(--foreground, #111)",
              borderRadius:
                "18px 18px 0 0",
              overflow:
                "hidden",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                padding:
                  "14px 16px",
                borderBottom:
                  "1px solid rgba(128,128,128,0.2)",
              }}
            >
              <strong>
                {followList.type ===
                "followers"
                  ? "Takipçiler"
                  : "Takip Ettikleri"}
              </strong>

              <button
                type="button"
                onClick={
                  closeFollowList
                }
                style={{
                  border:
                    "none",
                  background:
                    "rgba(128,128,128,0.12)",
                  borderRadius:
                    "50%",
                  width: "32px",
                  height: "32px",
                  fontSize:
                    "18px",
                  cursor:
                    "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                maxHeight:
                  "65vh",
                overflowY:
                  "auto",
                padding:
                  "8px 12px 16px",
              }}
            >
              {listLoading ? (
                <div
                  style={{
                    padding:
                      "30px 10px",
                    textAlign:
                      "center",
                    opacity: 0.7,
                  }}
                >
                  Liste yükleniyor...
                </div>
              ) : followList.error ? (
                <div
                  style={{
                    padding:
                      "30px 10px",
                    textAlign:
                      "center",
                    color: "#d33",
                  }}
                >
                  {followList.error}
                </div>
              ) : followList.users.length ===
                0 ? (
                <div
                  style={{
                    padding:
                      "30px 10px",
                    textAlign:
                      "center",
                    opacity: 0.7,
                  }}
                >
                  {followList.type ===
                  "followers"
                    ? "Henüz takipçisi yok."
                    : "Henüz kimseyi takip etmiyor."}
                </div>
              ) : (
                followList.users.map(
                  (item) => {
                    const name =
                      [
                        item.first_name,
                        item.last_name,
                      ]
                        .filter(
                          Boolean
                        )
                        .join(" ") ||
                      item.username ||
                      "Telegram kullanıcısı";

                    return (
                      <Link
                        key={
                          item.id
                        }
                        href={`/profil?user_id=${encodeURIComponent(
                          item.id
                        )}`}
                        onClick={
                          closeFollowList
                        }
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: "10px",
                          padding:
                            "9px 4px",
                          width:
                            "100%",
                          boxSizing:
                            "border-box",
                          textDecoration:
                            "none",
                          color:
                            "inherit",
                          borderRadius:
                            "10px",
                        }}
                      >
                        {item.avatar_url ? (
                          <img
                            src={
                              item.avatar_url
                            }
                            alt={
                              name
                            }
                            width={
                              44
                            }
                            height={
                              44
                            }
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
                              flexShrink:
                                0,
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
                                "var(--primary)",
                              color:
                                "#fff",
                              fontWeight:
                                800,
                              flexShrink:
                                0,
                            }}
                          >
                            {(
                              item.first_name ||
                              item.username ||
                              "T"
                            )
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </div>
                        )}

                        <div
                          style={{
                            minWidth:
                              0,
                            flex:
                              "1 1 auto",
                          }}
                        >
                          <strong
                            style={{
                              display:
                                "block",
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                              fontSize:
                                "14px",
                            }}
                          >
                            {name}
                          </strong>

                          {item.username ? (
                            <span
                              style={{
                                display:
                                  "block",
                                fontSize:
                                  "12px",
                                opacity:
                                  0.65,
                              }}
                            >
                              @{item.username}
                            </span>
                          ) : null}
                        </div>

                        <span
                          style={{
                            flexShrink:
                              0,
                            fontSize:
                              "18px",
                            opacity:
                              0.35,
                          }}
                        >
                          ›
                        </span>
                      </Link>
                    );
                  }
                )
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
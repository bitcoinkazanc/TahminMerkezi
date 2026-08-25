"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function PredictionMessage({
  prediction,
}) {
  if (!prediction) {
    return null;
  }

  const user = prediction.users;
  const match = prediction.matches;

  const username = user?.username
    ? `@${user.username}`
    : "Telegram Kullanıcısı";

  const avatarLetter = (
    user?.username ||
    user?.first_name ||
    "T"
  )
    .charAt(0)
    .toUpperCase();

  const predictionLabels = {
    MS1: "MS 1",
    MSX: "MS X",
    MS2: "MS 2",
  };

  const predictionLabel =
    predictionLabels[prediction.prediction] ||
    prediction.prediction;

  const date = prediction.created_at
    ? new Date(prediction.created_at)
    : null;

  const formattedDate =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "short",
        })
      : "";

  const formattedTime =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  const matchName = match
    ? `${match.home_team} - ${match.away_team}`
    : "Maç bilgisi yok";

  const [userId, setUserId] =
    useState(null);

  const [likeCount, setLikeCount] =
    useState(0);

  const [liked, setLiked] =
    useState(false);

  const [comments, setComments] =
    useState([]);

  const [commentsOpen, setCommentsOpen] =
    useState(false);

  const [commentText, setCommentText] =
    useState("");

  const [commentLoading, setCommentLoading] =
    useState(false);

  const [likeLoading, setLikeLoading] =
    useState(false);

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem("tm_user");

      if (!savedUser) return;

      const parsed =
        JSON.parse(savedUser);

      if (parsed?.id) {
        setUserId(parsed.id);
      }
    } catch (error) {
      console.error(
        "Prediction user loading error:",
        error
      );
    }
  }, []);

  useEffect(() => {
    async function loadLikeInfo() {
      try {
        const query = new URLSearchParams();

        query.set(
          "prediction_id",
          prediction.id
        );

        if (userId) {
          query.set(
            "user_id",
            userId
          );
        }

        const response = await fetch(
          `/api/likes?${query.toString()}`,
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
          setLikeCount(
            result.count || 0
          );

          setLiked(
            !!result.liked
          );
        }
      } catch (error) {
        console.error(
          "Like loading error:",
          error
        );
      }
    }

    if (prediction.id) {
      loadLikeInfo();
    }
  }, [prediction.id, userId]);

  async function loadComments() {
    try {
      const response = await fetch(
        `/api/comments?prediction_id=${encodeURIComponent(
          prediction.id
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
        setComments(
          result.comments || []
        );
      }
    } catch (error) {
      console.error(
        "Comments loading error:",
        error
      );
    }
  }

  async function toggleComments() {
    const nextState =
      !commentsOpen;

    setCommentsOpen(nextState);

    if (
      nextState &&
      comments.length === 0
    ) {
      await loadComments();
    }
  }

  async function handleLike() {
    if (!userId || likeLoading) {
      return;
    }

    try {
      setLikeLoading(true);

      const response = await fetch(
        "/api/likes",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            prediction_id:
              prediction.id,
          }),
        }
      );

      const result =
        await response.json();

      if (
        response.ok &&
        result.success
      ) {
        const nextLiked =
          !!result.liked;

        setLiked(nextLiked);

        setLikeCount((current) =>
          nextLiked
            ? current + 1
            : Math.max(
                0,
                current - 1
              )
        );
      }
    } catch (error) {
      console.error(
        "Like error:",
        error
      );
    } finally {
      setLikeLoading(false);
    }
  }

  async function submitComment(
    event
  ) {
    event.preventDefault();

    if (
      !userId ||
      !commentText.trim() ||
      commentLoading
    ) {
      return;
    }

    try {
      setCommentLoading(true);

      const response = await fetch(
        "/api/comments",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            prediction_id:
              prediction.id,
            content:
              commentText.trim(),
          }),
        }
      );

      const result =
        await response.json();

      if (
        response.ok &&
        result.success
      ) {
        setComments((current) => [
          ...current,
          result.comment,
        ]);

        setCommentText("");

        setCommentsOpen(true);
      }
    } catch (error) {
      console.error(
        "Comment error:",
        error
      );
    } finally {
      setCommentLoading(false);
    }
  }

  return (
    <article
      className="prediction-message"
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        className="prediction-message-main"
        style={{
          display: "flex",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <div
          className="prediction-message-avatar"
          style={{
            flex: "0 0 auto",
          }}
        >
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={username}
              className="user-avatar"
            />
          ) : (
            <div className="user-avatar-placeholder">
              {avatarLetter}
            </div>
          )}
        </div>

        <div
          className="prediction-message-content"
          style={{
            flex: "1 1 auto",
            width: 0,
            maxWidth: "100%",
            minWidth: 0,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <div
            className="prediction-message-top"
            style={{
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <strong
              style={{
                display: "block",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "12px",
                lineHeight: 1.2,
              }}
            >
              {username}
            </strong>
          </div>

          {match ? (
            <div
              style={{
                marginTop: "4px",
                marginBottom: "5px",
                minWidth: 0,
                maxWidth: "100%",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  maxWidth: "100%",
                  minWidth: 0,
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "var(--text)",
                  lineHeight: 1.2,
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                ⚽ {matchName}
              </div>

              {match.league ? (
                <div
                  style={{
                    marginTop: "2px",
                    fontSize: "9px",
                    color: "var(--muted)",
                  }}
                >
                  🏆 {match.league}
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              flexWrap: "wrap",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "3px 6px",
                borderRadius: "6px",
                background:
                  "var(--primary)",
                color: "#fff",
                fontSize: "9px",
                fontWeight: 800,
              }}
            >
              🎯 {predictionLabel}
            </span>

            {prediction.confidence != null ? (
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  color:
                    "var(--text)",
                }}
              >
                📊 %{prediction.confidence}
              </span>
            ) : null}
          </div>

          {prediction.message ? (
            <div
              style={{
                width: "100%",
                marginTop: "4px",
                padding: "6px 8px",
                borderRadius: "7px",
                background:
                  "var(--surface-soft)",
                border:
                  "1px solid var(--border)",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  marginBottom: "2px",
                  fontSize: "8px",
                  fontWeight: 800,
                  color:
                    "var(--muted)",
                }}
              >
                📝 Analiz
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: "9px",
                  lineHeight: 1.3,
                  color:
                    "var(--text)",
                  whiteSpace:
                    "pre-wrap",
                  overflowWrap:
                    "anywhere",
                  wordBreak:
                    "break-word",
                }}
              >
                {prediction.message}
              </p>
            </div>
          ) : null}

          {formattedDate ? (
            <div
              style={{
                marginTop: "4px",
                fontSize: "8px",
                color:
                  "var(--muted)",
              }}
            >
              🕐 {formattedDate} ·{" "}
              {formattedTime}
            </div>
          ) : null}
        </div>
      </div>

      {/* SOSYAL BUTONLAR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          marginTop: "6px",
          paddingTop: "5px",
          borderTop:
            "1px solid var(--border)",
        }}
      >
        <button
          type="button"
          onClick={handleLike}
          disabled={
            !userId ||
            likeLoading
          }
          style={{
            border: "none",
            background:
              liked
                ? "var(--surface-soft)"
                : "transparent",
            color: liked
              ? "var(--primary)"
              : "var(--muted)",
            padding:
              "4px 7px",
            borderRadius: "6px",
            fontSize: "10px",
            fontWeight: 800,
            cursor:
              userId
                ? "pointer"
                : "default",
          }}
        >
          {liked ? "❤️" : "🤍"}{" "}
          {likeCount}
        </button>

        <button
          type="button"
          onClick={toggleComments}
          style={{
            border: "none",
            background:
              commentsOpen
                ? "var(--surface-soft)"
                : "transparent",
            color:
              "var(--muted)",
            padding:
              "4px 7px",
            borderRadius: "6px",
            fontSize: "10px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          💬 {comments.length}
        </button>

        <span
          style={{
            marginLeft: "auto",
            fontSize: "9px",
            color:
              "var(--muted)",
          }}
        >
          ⭐ {prediction.points || 0}
        </span>
      </div>

      {/* YORUMLAR */}
      {commentsOpen ? (
        <div
          style={{
            marginTop: "5px",
            paddingTop: "5px",
            borderTop:
              "1px solid var(--border)",
          }}
        >
          {comments.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: "5px",
                marginBottom:
                  "6px",
              }}
            >
              {comments.map(
                (comment) => {
                  const commentUser =
                    comment.users;

                  const commentName =
                    commentUser?.username
                      ? `@${commentUser.username}`
                      : commentUser?.first_name ||
                        "Kullanıcı";

                  return (
                    <div
                      key={
                        comment.id
                      }
                      style={{
                        display:
                          "flex",
                        gap: "6px",
                        padding:
                          "5px 6px",
                        borderRadius:
                          "6px",
                        background:
                          "var(--surface-soft)",
                      }}
                    >
                      <strong
                        style={{
                          fontSize:
                            "9px",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {commentName}
                      </strong>

                      <span
                        style={{
                          fontSize:
                            "9px",
                          color:
                            "var(--text)",
                          overflowWrap:
                            "anywhere",
                        }}
                      >
                        {comment.content}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div
              style={{
                fontSize: "9px",
                color:
                  "var(--muted)",
                marginBottom:
                  "5px",
              }}
            >
              Henüz yorum yok.
            </div>
          )}

          {userId ? (
            <form
              onSubmit={
                submitComment
              }
              style={{
                display:
                  "flex",
                gap: "5px",
              }}
            >
              <input
                type="text"
                value={
                  commentText
                }
                onChange={(event) =>
                  setCommentText(
                    event.target
                      .value
                  )
                }
                maxLength={500}
                placeholder="Yorum yaz..."
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: "28px",
                  padding:
                    "4px 7px",
                  border:
                    "1px solid var(--border)",
                  borderRadius:
                    "6px",
                  background:
                    "var(--surface)",
                  color:
                    "var(--text)",
                  fontSize:
                    "9px",
                  outline:
                    "none",
                }}
              />

              <button
                type="submit"
                disabled={
                  commentLoading ||
                  !commentText.trim()
                }
                style={{
                  border:
                    "none",
                  borderRadius:
                    "6px",
                  padding:
                    "4px 8px",
                  background:
                    "var(--primary)",
                  color:
                    "#fff",
                  fontSize:
                    "9px",
                  fontWeight:
                    800,
                }}
              >
                Gönder
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {match ? (
        <div
          style={{
            display: "flex",
            gap: "5px",
            width: "100%",
            marginTop: "6px",
            paddingTop: "5px",
            borderTop:
              "1px solid var(--border)",
            boxSizing:
              "border-box",
          }}
        >
          {user?.id ? (
            <Link
              href={`/profil?user_id=${encodeURIComponent(
                user.id
              )}`}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                minHeight:
                  "27px",
                padding:
                  "4px 5px",
                border:
                  "1px solid var(--border)",
                borderRadius:
                  "6px",
                background:
                  "var(--surface-soft)",
                color:
                  "var(--text)",
                fontSize:
                  "9px",
                fontWeight:
                  800,
                textDecoration:
                  "none",
              }}
            >
              👤 Profil
            </Link>
          ) : null}

          <Link
            href={`/mac/${encodeURIComponent(
              match.external_id
            )}`}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              minHeight:
                "27px",
              padding:
                "4px 5px",
              border:
                "1px solid var(--primary)",
              borderRadius:
                "6px",
              background:
                "var(--primary)",
              color:
                "#fff",
              fontSize:
                "9px",
              fontWeight:
                800,
              textDecoration:
                "none",
            }}
          >
            ⚽ Maça Git
          </Link>
        </div>
      ) : null}
    </article>
  );
}
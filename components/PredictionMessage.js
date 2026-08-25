"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function PredictionMessage({
  prediction,
}) {
  const user = prediction?.users;
  const match = prediction?.matches;

  const [userId, setUserId] =
    useState(null);

  const [likeCount, setLikeCount] =
    useState(0);

  const [liked, setLiked] =
    useState(false);

  const [likeLoading, setLikeLoading] =
    useState(false);

  const [likeError, setLikeError] =
    useState("");

  const [commentCount, setCommentCount] =
    useState(0);

  const [comments, setComments] =
    useState([]);

  const [commentsOpen, setCommentsOpen] =
    useState(false);

  const [commentText, setCommentText] =
    useState("");

  const [commentLoading, setCommentLoading] =
    useState(false);

  if (!prediction) {
    return null;
  }

  const username = user?.username
    ? `@${user.username}`
    : user?.first_name ||
      "Telegram Kullanıcısı";

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
    predictionLabels[
      prediction.prediction
    ] ||
    prediction.prediction;

  const date = prediction.created_at
    ? new Date(
        prediction.created_at
      )
    : null;

  const formattedDate =
    date &&
    !Number.isNaN(
      date.getTime()
    )
      ? date.toLocaleDateString(
          "tr-TR",
          {
            day: "2-digit",
            month: "short",
          }
        )
      : "";

  const formattedTime =
    date &&
    !Number.isNaN(
      date.getTime()
    )
      ? date.toLocaleTimeString(
          "tr-TR",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        )
      : "";

  const matchName = match
    ? `${match.home_team} - ${match.away_team}`
    : "Maç bilgisi yok";

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem(
          "tm_user"
        );

      if (!savedUser) {
        return;
      }

      const parsed =
        JSON.parse(savedUser);

      if (parsed?.id) {
        setUserId(
          String(parsed.id)
        );
      }
    } catch (error) {
      console.error(
        "Prediction user loading error:",
        error
      );
    }
  }, []);

  useEffect(() => {
    if (!prediction.id) {
      return;
    }

    async function loadSocialData() {
      try {
        const likeQuery =
          new URLSearchParams();

        likeQuery.set(
          "prediction_id",
          String(
            prediction.id
          )
        );

        if (userId) {
          likeQuery.set(
            "user_id",
            String(userId)
          );
        }

        const [
          likesResponse,
          commentsResponse,
        ] = await Promise.all([
          fetch(
            `/api/likes?${likeQuery.toString()}`,
            {
              cache: "no-store",
            }
          ),
          fetch(
            `/api/comments?prediction_id=${encodeURIComponent(
              prediction.id
            )}`,
            {
              cache: "no-store",
            }
          ),
        ]);

        const likesResult =
          await likesResponse.json();

        const commentsResult =
          await commentsResponse.json();

        if (
          likesResponse.ok &&
          likesResult.success
        ) {
          setLikeCount(
            Number(
              likesResult.count
            ) || 0
          );

          setLiked(
            !!likesResult.liked
          );
        }

        if (
          commentsResponse.ok &&
          commentsResult.success
        ) {
          const loadedComments =
            Array.isArray(
              commentsResult.comments
            )
              ? commentsResult.comments
              : [];

          setCommentCount(
            loadedComments.length
          );

          if (
            commentsOpen
          ) {
            setComments(
              loadedComments
            );
          }
        }
      } catch (error) {
        console.error(
          "Prediction social data error:",
          error
        );
      }
    }

    loadSocialData();
  }, [
    prediction.id,
    userId,
  ]);

  async function handleLike() {
    if (!userId) {
      setLikeError(
        "Beğenmek için kullanıcı girişi gerekli."
      );
      return;
    }

    if (likeLoading) {
      return;
    }

    try {
      setLikeLoading(true);
      setLikeError("");

      const response =
        await fetch(
          "/api/likes",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              user_id:
                String(userId),
              prediction_id:
                String(
                  prediction.id
                ),
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
            "Beğeni işlemi başarısız."
        );
      }

      setLiked(
        !!result.liked
      );

      if (
        result.count != null
      ) {
        setLikeCount(
          Number(
            result.count
          ) || 0
        );
      } else {
        setLikeCount(
          (current) =>
            result.liked
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

      setLikeError(
        error.message ||
          "Beğeni işlemi başarısız."
      );
    } finally {
      setLikeLoading(false);
    }
  }

  async function loadComments() {
    try {
      const response =
        await fetch(
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
        const loadedComments =
          Array.isArray(
            result.comments
          )
            ? result.comments
            : [];

        setComments(
          loadedComments
        );

        setCommentCount(
          loadedComments.length
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

    setCommentsOpen(
      nextState
    );

    if (nextState) {
      await loadComments();
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

      const response =
        await fetch(
          "/api/comments",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              user_id:
                String(userId),
              prediction_id:
                String(
                  prediction.id
                ),
              content:
                commentText.trim(),
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
            "Yorum gönderilemedi."
        );
      }

      if (
        result.comment
      ) {
        setComments(
          (current) => [
            ...current,
            result.comment,
          ]
        );

        setCommentCount(
          (current) =>
            current + 1
        );
      }

      setCommentText("");
      setCommentsOpen(true);
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
        boxSizing:
          "border-box",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          minWidth: 0,
          boxSizing:
            "border-box",
        }}
      >
        <div
          style={{
            flex:
              "0 0 auto",
          }}
        >
          {user?.avatar_url ? (
            <img
              src={
                user.avatar_url
              }
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
          style={{
            flex:
              "1 1 auto",
            width: 0,
            minWidth: 0,
            overflow:
              "hidden",
            boxSizing:
              "border-box",
          }}
        >
          <strong
            style={{
              display:
                "block",
              maxWidth:
                "100%",
              overflow:
                "hidden",
              textOverflow:
                "ellipsis",
              whiteSpace:
                "nowrap",
              fontSize:
                "12px",
              lineHeight:
                1.2,
            }}
          >
            {username}
          </strong>

          {match ? (
            <div
              style={{
                marginTop:
                  "4px",
                marginBottom:
                  "5px",
                minWidth: 0,
                overflow:
                  "hidden",
              }}
            >
              <div
                style={{
                  fontSize:
                    "12px",
                  fontWeight:
                    800,
                  color:
                    "var(--text)",
                  lineHeight:
                    1.2,
                  overflowWrap:
                    "anywhere",
                }}
              >
                ⚽ {matchName}
              </div>

              {match.league ? (
                <div
                  style={{
                    marginTop:
                      "2px",
                    fontSize:
                      "9px",
                    color:
                      "var(--muted)",
                  }}
                >
                  🏆{" "}
                  {
                    match.league
                  }
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: "5px",
              flexWrap:
                "wrap",
              marginBottom:
                "4px",
            }}
          >
            <span
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                padding:
                  "3px 6px",
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
              }}
            >
              🎯{" "}
              {
                predictionLabel
              }
            </span>

            {prediction.confidence !=
            null ? (
              <span
                style={{
                  fontSize:
                    "9px",
                  fontWeight:
                    700,
                  color:
                    "var(--text)",
                }}
              >
                📊 %{
                  prediction.confidence
                }
              </span>
            ) : null}
          </div>

          {prediction.message ? (
            <div
              style={{
                width:
                  "100%",
                marginTop:
                  "4px",
                padding:
                  "6px 8px",
                borderRadius:
                  "7px",
                background:
                  "var(--surface-soft)",
                border:
                  "1px solid var(--border)",
                boxSizing:
                  "border-box",
              }}
            >
              <div
                style={{
                  marginBottom:
                    "2px",
                  fontSize:
                    "8px",
                  fontWeight:
                    800,
                  color:
                    "var(--muted)",
                }}
              >
                📝 Analiz
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize:
                    "9px",
                  lineHeight:
                    1.3,
                  color:
                    "var(--text)",
                  whiteSpace:
                    "pre-wrap",
                  overflowWrap:
                    "anywhere",
                }}
              >
                {
                  prediction.message
                }
              </p>
            </div>
          ) : null}

          {formattedDate ? (
            <div
              style={{
                marginTop:
                  "4px",
                fontSize:
                  "8px",
                color:
                  "var(--muted)",
              }}
            >
              🕐{" "}
              {
                formattedDate
              }{" "}
              ·{" "}
              {
                formattedTime
              }
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display:
            "flex",
          alignItems:
            "center",
          gap: "4px",
          marginTop:
            "5px",
          paddingTop:
            "4px",
          borderTop:
            "1px solid var(--border)",
        }}
      >
        <button
          type="button"
          onClick={
            handleLike
          }
          disabled={
            likeLoading
          }
          style={{
            border:
              "none",
            background:
              liked
                ? "var(--surface-soft)"
                : "transparent",
            color:
              liked
                ? "var(--primary)"
                : "var(--muted)",
            padding:
              "4px 6px",
            borderRadius:
              "6px",
            fontSize:
              "10px",
            fontWeight:
              800,
            cursor:
              likeLoading
                ? "wait"
                : "pointer",
          }}
        >
          {liked
            ? "❤️"
            : "🤍"}{" "}
          {likeCount}
        </button>

        <button
          type="button"
          onClick={
            toggleComments
          }
          style={{
            border:
              "none",
            background:
              commentsOpen
                ? "var(--surface-soft)"
                : "transparent",
            color:
              "var(--muted)",
            padding:
              "4px 6px",
            borderRadius:
              "6px",
            fontSize:
              "10px",
            fontWeight:
              800,
            cursor:
              "pointer",
          }}
        >
          💬{" "}
          {commentCount}
        </button>
      </div>

      {likeError ? (
        <div
          style={{
            marginTop:
              "3px",
            fontSize:
              "9px",
            color:
              "#d93025",
          }}
        >
          {likeError}
        </div>
      ) : null}

      {commentsOpen ? (
        <div
          style={{
            marginTop:
              "5px",
            paddingTop:
              "5px",
            borderTop:
              "1px solid var(--border)",
          }}
        >
          {comments.length >
          0 ? (
            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap:
                  "5px",
                marginBottom:
                  "6px",
              }}
            >
              {comments.map(
                (
                  comment
                ) => {
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
                        gap:
                          "6px",
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
                        {
                          commentName
                        }
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
                        {
                          comment.content
                        }
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div
              style={{
                fontSize:
                  "9px",
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
                gap:
                  "5px",
              }}
            >
              <input
                type="text"
                value={
                  commentText
                }
                onChange={(
                  event
                ) =>
                  setCommentText(
                    event
                      .target
                      .value
                  )
                }
                maxLength={
                  500
                }
                placeholder="Yorum yaz..."
                style={{
                  flex:
                    1,
                  minWidth:
                    0,
                  height:
                    "28px",
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
            display:
              "flex",
            gap:
              "5px",
            width:
              "100%",
            marginTop:
              "6px",
            paddingTop:
              "5px",
            borderTop:
              "1px solid var(--border)",
          }}
        >
          {user?.id ? (
            <Link
              href={`/profil?user_id=${encodeURIComponent(
                user.id
              )}`}
              style={{
                flex:
                  "1 1 0",
                minWidth:
                  0,
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
              flex:
                "1 1 0",
              minWidth:
                0,
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
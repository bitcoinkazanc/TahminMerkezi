"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    accuracy: 0,
    points: 0,
    correct: 0,
    rank: {
      name: "Çaylak",
      icon: "🌱",
    },
  });

  useEffect(() => {
    try {
      const savedUser =
        localStorage.getItem("tm_user");

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error(
        "User loading error:",
        error
      );
    }
  }, []);

  useEffect(() => {
    async function loadStats() {
      if (!user?.id) return;

      try {
        const response = await fetch(
          `/api/leaderboard?period=all&user_id=${encodeURIComponent(
            user.id
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
          return;
        }

        const currentUser =
          result.current_user;

        if (currentUser) {
          setStats({
            accuracy:
              currentUser.accuracy || 0,

            points:
              currentUser.points || 0,

            correct:
              currentUser.correct || 0,

            rank:
              currentUser.rank || {
                name: "Çaylak",
                icon: "🌱",
              },
          });
        }
      } catch (error) {
        console.error(
          "Header stats loading error:",
          error
        );
      }
    }

    loadStats();
  }, [user?.id]);

  const displayName =
    user?.first_name ||
    user?.username ||
    "Misafir";

  const username = user?.username
    ? `@${user.username}`
    : displayName;

  function goHome() {
    router.push("/");
  }

  function goProfile() {
    router.push("/profil");
  }

  return (
    <header className="header">
      <div className="header-inner">
        <button
          type="button"
          onClick={goHome}
          className="header-brand"
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            margin: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span className="header-logo">
            ⚽
          </span>

          <span className="header-title">
            TahminMerkezi
          </span>
        </button>

        <button
          type="button"
          onClick={goProfile}
          className="header-profile"
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            margin: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              minWidth: 0,
              textAlign: "right",
              lineHeight: 1.15,
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "130px",
              }}
            >
              {username}
            </div>

            <div
              style={{
                marginTop: "3px",
                fontSize: "9px",
                opacity: 0.75,
                whiteSpace: "nowrap",
              }}
            >
              {stats.rank?.icon || "🌱"}{" "}
              {stats.rank?.name || "Çaylak"}
              {" · "}
              %{stats.accuracy}
              {" · "}
              ⭐{stats.points}
            </div>
          </div>

          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={displayName}
              className="header-avatar"
            />
          ) : (
            <div className="header-avatar-placeholder">
              {displayName
                .charAt(0)
                .toUpperCase()}
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
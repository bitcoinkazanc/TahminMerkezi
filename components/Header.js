"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();

  const [user, setUser] = useState(null);

  const [stats, setStats] = useState({
    accuracy: 0,
    points: 0,
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

        if (result.current_user) {
          setStats({
            accuracy:
              result.current_user.accuracy || 0,

            points:
              result.current_user.points || 0,

            rank:
              result.current_user.rank || {
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

  const username =
    user?.username
      ? `@${user.username}`
      : "@kullanıcı";

  const displayName =
    user?.first_name ||
    user?.username ||
    "Kullanıcı";

  return (
    <header className="header">
      <div className="header-inner">

        <button
          type="button"
          onClick={() => router.push("/")}
          className="header-brand"
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            margin: 0,
            cursor: "pointer",
          }}
        >
          <span className="header-logo">
            ⚽
          </span>

          <span className="header-title">
            TahminMerkezi
          </span>
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            gap: "8px",
          }}
        >

          <button
            type="button"
            onClick={() =>
              router.push("/profil")
            }
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              margin: 0,
              cursor: "pointer",
              textAlign: "right",
              color: "inherit",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                lineHeight: "14px",
                whiteSpace: "nowrap",
              }}
            >
              {username}
            </div>

            <div
              style={{
                marginTop: "2px",
                fontSize: "9px",
                fontWeight: 700,
                lineHeight: "12px",
                whiteSpace: "nowrap",
                opacity: 0.75,
              }}
            >
              {stats.rank?.icon || "🌱"}{" "}
              {stats.rank?.name || "Çaylak"}
              {" · "}
              %{stats.accuracy}
              {" · "}
              ⭐{stats.points}
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push("/profil")
            }
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              margin: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
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
      </div>
    </header>
  );
}
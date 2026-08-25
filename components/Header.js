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

  const username = user?.username
    ? `@${user.username}`
    : "@kullanıcı";

  const displayName =
    user?.first_name ||
    user?.username ||
    "Kullanıcı";

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
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",

            width: "auto",
            minWidth: 0,
            flexShrink: 0,

            overflow: "visible",
            boxSizing: "border-box",
          }}
        >

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "center",

              minWidth: 0,
              flexShrink: 1,

              marginRight: "8px",
              lineHeight: 1.15,
              textAlign: "right",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,

                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",

                maxWidth: "110px",
              }}
            >
              {username}
            </div>

            <div
              style={{
                marginTop: "3px",
                fontSize: "9px",
                fontWeight: 700,

                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",

                maxWidth: "125px",
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
          </div>

          <div
            style={{
              width: "40px",
              height: "40px",
              minWidth: "40px",
              flexShrink: 0,
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
          </div>

        </button>
      </div>
    </header>
  );
}
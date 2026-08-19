"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("tm_user");

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error("User loading error:", error);
    }
  }, []);

  const displayName =
    user?.first_name ||
    user?.username ||
    "Misafir";

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="header-brand">
          <span className="header-logo">⚽</span>

          <span className="header-title">
            TahminMerkezi
          </span>
        </Link>

        <Link href="/profil" className="header-profile">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={displayName}
              className="header-avatar"
            />
          ) : (
            <div className="header-avatar-placeholder">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
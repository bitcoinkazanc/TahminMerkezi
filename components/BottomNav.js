"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const items = [
    {
      href: "/",
      label: "Ana Sayfa",
      icon: "🏠",
    },
    {
      href: "/maclar",
      label: "Maçlar",
      icon: "⚽",
    },
    {
      href: "/tahminler",
      label: "Tahminler",
      icon: "🎯",
    },
    {
      href: "/liderlik",
      label: "Liderlik",
      icon: "🏆",
    },
    {
      href: "/profil",
      label: "Profil",
      icon: "👤",
    },
  ];

  return (
    <nav
      className="bottom-nav"
      style={{
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        className="bottom-nav-inner"
        style={{
          width: "100%",
          maxWidth: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bottom-nav-item ${
                active ? "active" : ""
              }`}
              style={{
                flex: "1 1 0",
                width: "20%",
                minWidth: 0,
                maxWidth: "20%",
                boxSizing: "border-box",
                paddingLeft: "2px",
                paddingRight: "2px",
                overflow: "hidden",
              }}
            >
              <span
                className="bottom-nav-icon"
                style={{
                  fontSize: "17px",
                  lineHeight: 1,
                }}
              >
                {item.icon}
              </span>

              <span
                className="bottom-nav-label"
                style={{
                  fontSize: "9px",
                  lineHeight: "12px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
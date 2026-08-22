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
      href: "/tahminler",
      label: "Tahminler",
      icon: "🎯",
    },
    {
      href: "/profil",
      label: "Profil",
      icon: "👤",
    },
  ];

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-inner">
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
            >
              <span className="bottom-nav-icon">
                {item.icon}
              </span>

              <span className="bottom-nav-label">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
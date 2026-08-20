"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

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

  function handleProfileClick(event) {
    event.preventDefault();

    router.push("/profil");
    router.refresh();
  }

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
              onClick={
                item.href === "/profil"
                  ? handleProfileClick
                  : undefined
              }
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
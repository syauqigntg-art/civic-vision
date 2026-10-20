"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menu = [
  { href: "/", label: "Beranda" },
  { href: "/lkpd/kasus", label: "Video Kasus" },
  { href: "/lkpd/identitas", label: "LKPD" },
  { href: "/admin", label: "Guru" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="cv-navbar" aria-label="Navigasi utama">
      {menu.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href ||
              pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`cv-nav-link${active ? " active" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

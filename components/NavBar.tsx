"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menu = [
  { href: "/", label: "Beranda", icon: "⌂" },
  { href: "/lkpd/kasus", label: "Video Kasus", icon: "▷" },
  { href: "/lkpd/identitas", label: "LKPD", icon: "▤" },
  { href: "/admin", label: "Guru", icon: "♧" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="cv-navbar" aria-label="Navigasi utama">
      {menu.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
        return <Link key={item.href} href={item.href} className={`cv-nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
          <span className="cv-nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
        </Link>;
      })}
    </nav>
  );
}

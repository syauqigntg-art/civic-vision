"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  const inAdmin = path === "/admin" || path.startsWith("/admin/");

  return (
    <>
      <a className="skip" href="#konten">
        Lewati ke konten
      </a>

      {inAdmin ? (
        <div className="admin-outer">{children}</div>
      ) : (
        <div className="page">
          <header className="glass top">
            <div>
              <b style={{ letterSpacing: ".06em" }}>CIVIC VISION</b>
              <div style={{ fontSize: 12, opacity: 0.85 }}>LKPD Digital</div>
            </div>
            <NavBar />
          </header>
          <main id="konten" tabIndex={-1}>
            {children}
          </main>
        </div>
      )}
    </>
  );
}

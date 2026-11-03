"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const inAdmin = path === "/admin" || path.startsWith("/admin/");
  const onStudentHome = path === "/";

  return (
    <>
      <a className="skip" href="#konten">Lewati ke konten</a>
      {inAdmin ? (
        <div className="admin-outer">{children}</div>
      ) : onStudentHome ? (
        <div className="student-shell">
          <header className="student-header">
            <Link href="/" className="student-brand" aria-label="CIVIC VISION Beranda">
              <span className="student-brand-mark" aria-hidden="true">
                <svg viewBox="0 0 48 48" focusable="false" aria-hidden="true">
                  <path d="M24 4 29.5 15.5 42 18 33.5 27 35.5 40 24 34 12.5 40 14.5 27 6 18 18.5 15.5Z" />
                  <path d="M12 28.5 24 34.5 36 28.5M12 28.5 12 36 24 42 36 36 36 28.5" />
                  <path d="M24 10.5v18M17.5 17 24 10.5 30.5 17" />
                  <circle className="logo-core" cx="24" cy="23" r="2.4" />
                </svg>
              </span>
              <span><strong>CIVIC VISION</strong><small>LKPD Digital</small></span>
            </Link>
            <NavBar />
            <div className="student-profile" aria-label="Area siswa">
              <span className="student-profile-avatar" aria-hidden="true">S</span>
              <span><strong>Syauqi Alif</strong><small>Siswa · XI</small></span>
              <span aria-hidden="true">⌄</span>
            </div>
          </header>
          <main id="konten" className="student-main" tabIndex={-1}>{children}</main>
        </div>
      ) : (
        <div className="page">
          <header className="glass top">
            <div><b style={{ letterSpacing: ".06em" }}>CIVIC VISION</b><div style={{ fontSize: 12, opacity: 0.85 }}>LKPD Digital</div></div>
            <NavBar />
          </header>
          <main id="konten" tabIndex={-1}>{children}</main>
        </div>
      )}
    </>
  );
}

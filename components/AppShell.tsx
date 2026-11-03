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
                  <path d="M36.5 10.5A19 19 0 1 0 36.5 37.5" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="butt"/>
                  <path d="M34 15.5 42 10v11Z" fill="#83d8ff"/>
                  <path d="M34 32.5 42 38v-11Z" fill="#83d8ff"/>
                  <path d="M11 24h15" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".9"/>
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

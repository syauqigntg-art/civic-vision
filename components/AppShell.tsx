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
                  <path d="M5 24s7-11 19-11 19 11 19 11-7 11-19 11S5 24 5 24Z" />
                  <circle className="logo-pupil" cx="24" cy="24" r="4.5" />
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

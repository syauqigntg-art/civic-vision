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
                <svg viewBox="0 0 48 48" focusable="false">
                  <path d="M7 18V12a5 5 0 0 1 5-5h6M30 7h6a5 5 0 0 1 5 5v6M41 30v6a5 5 0 0 1-5 5h-6M18 41h-6a5 5 0 0 1-5-5v-6" />
                  <path d="M12 24c3.2-5 7.2-7.5 12-7.5S32.8 19 36 24c-3.2 5-7.2 7.5-12 7.5S15.2 29 12 24Z" />
                  <circle cx="24" cy="24" r="3.5" />
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

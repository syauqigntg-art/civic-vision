"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";
import BrandLogo from "@/components/brand/BrandLogo";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const inAdmin = path === "/admin" || path.startsWith("/admin/");
  const onAuthPage = path === "/admin/login" || path === "/lkpd/login";
  const onStudentHome = path === "/";
  const onStudentCase = path === "/lkpd/kasus" || path.startsWith("/lkpd/kasus/");
  const onStudentAccess = path === "/lkpd/identitas";

  return (
    <>
      <a className="skip" href="#konten">Lewati ke konten</a>
      {onAuthPage ? (
        <div className="cv-auth-shell">
          <header className="cv-auth-header">
            <Link href="/" className="cv-auth-brand" aria-label="Civic Vision Beranda"><BrandLogo variant="horizontal" /></Link>
            <NavBar />
            <div className="cv-auth-actions">
              <Link href="/admin/login" className={path === "/admin/login" ? "active" : ""}>Login Guru</Link>
              <Link href="/lkpd/login" className={path === "/lkpd/login" ? "active" : ""}>Login Siswa</Link>
            </div>
          </header>
          {children}
        </div>
      ) : inAdmin ? (
        <div className="admin-outer">{children}</div>
      ) : onStudentHome || onStudentCase || onStudentAccess ? (
        <div className="student-shell">
          <header className="student-header">
            <Link href="/" className="student-brand" aria-label="CIVIC VISION Beranda">
              <BrandLogo variant="horizontal" className="student-brand-logo" />
            </Link>
            <NavBar />
            <Link href="/lkpd/kasus" className="student-profile" aria-label="Kembali ke dashboard LKPD siswa"><span className="student-profile-avatar" aria-hidden="true">S</span><span><strong>Syauqi Alif</strong><small>Siswa · XI</small></span><span aria-hidden="true">⌄</span></Link>
          </header>
          <main id="konten" className="student-main" tabIndex={-1}>{children}</main>
        </div>
      ) : (
        <div className="page">
          <header className="glass top">
            <BrandLogo variant="horizontal" className="legacy-shell-brand" />
            <NavBar />
          </header>
          <main id="konten" tabIndex={-1}>{children}</main>
        </div>
      )}
    </>
  );
}

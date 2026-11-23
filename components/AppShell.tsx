"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";
import BrandLogo from "@/components/brand/BrandLogo";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const inAdmin = path === "/admin" || path.startsWith("/admin/");
  const onStudentHome = path === "/";
  const onStudentCase = path === "/lkpd/kasus" || path.startsWith("/lkpd/kasus/");
  const onStudentAccess = path === "/lkpd/identitas";
  const onStudentLoginPreview = path === "/preview-login";

  return (
    <>
      <a className="skip" href="#konten">Lewati ke konten</a>
      {inAdmin ? (
        <div className="admin-outer">{children}</div>
      ) : onStudentHome || onStudentCase || onStudentAccess ? (
        <div className="student-shell">
          <header className="student-header">
            <Link href="/" className="student-brand" aria-label="CIVIC VISION Beranda">
              <BrandLogo variant="horizontal" tone="light" className="student-brand-logo" />
            </Link>
            <NavBar />
            <Link href="/lkpd/kasus" className="student-profile" aria-label="Kembali ke dashboard LKPD siswa" title="Dashboard LKPD">
              <span className="student-profile-avatar" aria-hidden="true">S</span>
              <span><strong>Syauqi Alif</strong><small>Siswa · XI</small></span>
              <span aria-hidden="true">⌄</span>
            </Link>
          </header>
          <main id="konten" className="student-main" tabIndex={-1}>{children}</main>
        </div>
      ) : onStudentLoginPreview ? (
        <>{children}</>
      ) : (
        <div className="page">
          <header className="glass top">
            <Link href="/" aria-label="CIVIC VISION Beranda" className="public-brand">
              <BrandLogo variant="horizontal" tone="light" className="legacy-shell-brand" />
            </Link>
            <NavBar />
          </header>
          <main id="konten" tabIndex={-1}>{children}</main>
        </div>
      )}
    </>
  );
}

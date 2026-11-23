"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";
import BrandLogo from "@/components/BrandLogo";

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
              <BrandLogo variant="horizontal-light" height={46} />
            </Link>
            <NavBar />
            <Link href="/lkpd/identitas" className="student-profile" aria-label="Masuk ke ruang kelompok dengan kode kelompok" title="Akses kelompok">
              <span className="student-profile-avatar" aria-hidden="true">K</span>
              <span><strong>Akses Kelompok</strong><small>Masuk dengan kode</small></span>
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
              <BrandLogo variant="horizontal-light" height={44} />
            </Link>
            <NavBar />
          </header>
          <main id="konten" tabIndex={-1}>{children}</main>
        </div>
      )}
    </>
  );
}

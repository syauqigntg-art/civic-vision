"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import BrandLogo from "@/components/brand/BrandLogo";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [student, setStudent] = useState<{ name: string } | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/student-auth/me", { cache: "no-store" }).then(async (response) => response.ok ? response.json() : null).then((data) => { if (active && data?.authenticated) setStudent({ name: data.studentName || data.loginId || "Siswa" }); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const inAdmin = path === "/admin" || path.startsWith("/admin/");
  const onStudentHome = path === "/";
  const onStudentCase = path === "/lkpd/kasus" || path.startsWith("/lkpd/kasus/");
  const onStudentAccess = path === "/lkpd/identitas";

  return (
    <>
      <a className="skip" href="#konten">Lewati ke konten</a>
      {inAdmin ? (
        <div className="admin-outer">{children}</div>
      ) : onStudentHome || onStudentCase || onStudentAccess ? (
        <div className="student-shell">
          <header className="student-header">
            <Link href="/" className="student-brand" aria-label="CIVIC VISION Beranda">
              <BrandLogo variant="horizontal" className="student-brand-logo" />
            </Link>
            <NavBar />
            {student ? <Link href="/lkpd/kasus" className="student-profile" aria-label="Kembali ke dashboard LKPD siswa"><span className="student-profile-avatar" aria-hidden="true">{student.name.slice(0, 1).toUpperCase()}</span><span><strong>{student.name}</strong><small>Dashboard Siswa</small></span><span aria-hidden="true">⌄</span></Link> : <Link href="/lkpd/login" className="student-profile" aria-label="Login siswa"><span><strong>Login Siswa</strong><small>ID Siswa · PIN</small></span><span aria-hidden="true">→</span></Link>}
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { sb } from "@/lib/supabase";

const NAV = [
  { href: "/admin", label: "Dashboard", hint: "Ringkasan", icon: "⌂" },
  { href: "/admin/project", label: "Project", hint: "Identitas pembelajaran", icon: "▣" },
  { href: "/admin/videos", label: "Video Kasus", hint: "Materi media", icon: "▷" },
  { href: "/admin/questions", label: "Pertanyaan", hint: "Instrumen LKPD", icon: "?" },
  { href: "/admin/groups", label: "Kelompok", hint: "Daftar dan penugasan", icon: "◎" },
  { href: "/admin/submissions", label: "Jawaban Siswa", hint: "Hasil analisis", icon: "✓" },
  { href: "/admin/settings", label: "Pengaturan", hint: "Akun guru", icon: "⚙" },
];

const PAGE_INFO = [
  { href: "/admin", title: "Dashboard", desc: "Ringkasan aktivitas dan kemajuan pembelajaran." },
  { href: "/admin/project", title: "Pengaturan Project", desc: "Atur identitas dan informasi project pembelajaran." },
  { href: "/admin/videos", title: "Video Kasus", desc: "Kelola video pembelajaran dan materi kasus." },
  { href: "/admin/questions", title: "Pertanyaan LKPD", desc: "Susun pertanyaan berdasarkan tahap SEE, THINK, CONNECT, dan ACT." },
  { href: "/admin/groups", title: "Kelola Kelompok", desc: "Atur identitas kelompok dan distribusi video." },
  { href: "/admin/submissions", title: "Jawaban Siswa", desc: "Pantau status pengerjaan, tinjau jawaban, dan ekspor hasil." },
  { href: "/admin/settings", title: "Pengaturan Akun", desc: "Informasi akun guru dan akses keluar." },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  const r = useRouter();
  const [ok, setOk] = useState(false);
  const [email, setEmail] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (path === "/admin/login") return;
    let live = true;
    setOk(false);
    setAuthError("");

    const check = async () => {
      try {
        const { data } = await sb.auth.getUser();
        if (!data.user) {
          r.replace("/admin/login");
          return;
        }
        const q = await sb.from("users").select("role").eq("id", data.user.id).single();
        if (q.data?.role !== "admin") {
          r.replace("/admin/login?denied=1");
          return;
        }
        if (live) {
          setEmail(data.user.email || "");
          setOk(true);
        }
      } catch {
        if (live) setAuthError("Akses guru belum dapat diverifikasi. Muat ulang halaman.");
      }
    };

    check();
    return () => {
      live = false;
    };
  }, [path, r]);

  if (path === "/admin/login") return <div className="admin-login-frame">{children}</div>;

  if (!ok) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-mark">CV</div>
        <strong>{authError || "Memeriksa akses guru..."}</strong>
        <span>Ruang kerja CIVIC VISION</span>
      </div>
    );
  }

  const page = PAGE_INFO.find((item) =>
    item.href === "/admin"
      ? path === "/admin"
      : path === item.href || path.startsWith(item.href + "/")
  ) || PAGE_INFO[0];

  const logout = async () => {
    setLoggingOut(true);
    const { error } = await sb.auth.signOut();
    if (error) {
      setAuthError("Tidak dapat keluar. Silakan coba lagi.");
      setLoggingOut(false);
      return;
    }
    r.replace("/admin/login");
  };

  return (
    <div className="admin-workspace">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand">
          <span className="admin-brand-mark">CV</span>
          <span>
            <strong>CIVIC VISION</strong>
            <small>RUANG KERJA GURU</small>
          </span>
        </Link>

        <div className="admin-nav-label">WORKSPACE</div>
        <nav aria-label="Menu ruang kerja guru" className="admin-nav">
          {NAV.map((item) => {
            const active = item.href === "/admin"
              ? path === "/admin"
              : path === item.href || path.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"admin-nav-link" + (active ? " active" : "")}
                aria-current={active ? "page" : undefined}
              >
                <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="admin-nav-copy">
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
                {active && <span className="admin-nav-active-dot" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-foot">
          <div className="admin-sidebar-note">
            <span className="admin-status-dot" />
            <span><strong>Area guru</strong><small>Akses terverifikasi</small></span>
          </div>
          <Link href="/" className="admin-sidebar-site">↗ Buka halaman siswa</Link>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-heading">
            <div className="admin-breadcrumb"><span>Ruang kerja</span><span>/</span><strong>{page.title}</strong></div>
            <h1>{page.title}</h1>
            <p>{page.desc}</p>
          </div>
          <div className="admin-top-actions">
            <Link className="admin-outline-action" href="/" target="_blank" rel="noreferrer">
              Lihat website <span aria-hidden="true">↗</span>
            </Link>
            <div className="admin-user">
              <span className="admin-user-avatar">{email.trim().charAt(0).toUpperCase() || "G"}</span>
              <span className="admin-user-copy"><strong>Guru</strong><small>{email || "Akun admin"}</small></span>
            </div>
            <button className="admin-logout" type="button" onClick={logout} disabled={loggingOut}>
              {loggingOut ? "Keluar..." : "Keluar"}
            </button>
          </div>
        </header>

        {authError && <div className="admin-inline-error" role="alert">{authError}</div>}
        <main id="konten" tabIndex={-1} className="admin-page-content">
          {children}
        </main>
        <footer className="admin-footer">
          <span>CIVIC VISION <span aria-hidden="true">·</span> Ruang kerja guru</span>
          <span>Kelola materi, kelompok, dan hasil belajar dalam satu tempat.</span>
        </footer>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import "@/app/admin/login/login.css";
import { sb } from "@/lib/supabase";

function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
}
function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></svg>;
}
function EyeIcon({ visible }: { visible: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{visible ? <><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A11.7 11.7 0 0 1 12 5c5.2 0 9 4.6 10 7-.4 1-1.4 2.4-2.8 3.6" /><path d="M6.2 6.2C3.9 7.7 2.5 10 2 12c1 2.4 4.8 7 10 7 1.2 0 2.3-.2 3.3-.7" /></> : <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>}</svg>;
}
function CapIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="m4 17 20-10 20 10-20 10L4 17Z" /><path d="M12 21v11c7 6 17 6 24 0V21" /><path d="M44 18v13" /></svg>;
}

export default function Login() {
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.has("denied")) setErr("Akun ini tidak memiliki akses guru.");
    if (query.get("config") === "unavailable") setErr("Layanan backend belum dikonfigurasi. Login tidak tersedia saat ini.");
  }, []);

  const go = async () => {
    if (busy) return;
    if (!em.trim() || !pw) return setErr("Isi email dan kata sandi.");
    setErr("");
    setBusy(true);
    try {
      const { error } = await sb.auth.signInWithPassword({ email: em.trim(), password: pw });
      if (error) {
        setBusy(false);
        if (error.message === "Backend configuration is unavailable.") return setErr("Layanan backend belum dikonfigurasi. Login tidak tersedia saat ini.");
        return setErr("Email atau kata sandi salah.");
      }
      location.href = "/admin";
    } catch {
      setBusy(false);
      setErr("Layanan backend belum dapat dihubungi. Coba lagi nanti.");
    }
  };

  return (
    <main className="cv-login-page" id="konten">
      <div className="cv-login-atmosphere" aria-hidden="true" />
      <header className="cv-login-public-header">
        <Link href="/" className="cv-login-public-brand" aria-label="CIVIC VISION Beranda">
          <span className="cv-login-public-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48" focusable="false">
              <path d="M36.5 10.5A19 19 0 1 0 36.5 37.5" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="butt" />
              <path d="M34 15.5 42 10v11Z" fill="#83d8ff" />
              <path d="M34 32.5 42 38v-11Z" fill="#83d8ff" />
              <path d="M11 24h15" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".9" />
            </svg>
          </span>
          <span><strong>CIVIC VISION</strong><small>LKPD Digital</small></span>
        </Link>

        <button className="cv-login-menu-toggle" type="button" aria-label={mobileMenuOpen ? "Tutup navigasi" : "Buka navigasi"} aria-expanded={mobileMenuOpen} aria-controls="cv-login-public-navigation" onClick={() => setMobileMenuOpen((open) => !open)}>
          <span /><span /><span />
        </button>

        <div id="cv-login-public-navigation" className={"cv-login-public-navigation" + (mobileMenuOpen ? " is-open" : "")}>
          <NavBar />
          <div className="cv-login-public-actions">
            <span className="cv-login-active-teacher" aria-current="page">Login Guru</span>
            <Link href="/lkpd/identitas" className="cv-login-student-link" onClick={() => setMobileMenuOpen(false)}>Login Siswa</Link>
          </div>
        </div>
      </header>

      <section className="cv-login-main-panel" aria-label="Login guru CIVIC VISION">
        <div className="cv-login-intro">
          <div className="cv-login-intro-copy">
            <span className="cv-login-eyebrow">CIVIC VISION · UNTUK GURU</span>
            <h1>Login Guru</h1>
            <span className="cv-login-title-accent" aria-hidden="true" />
            <p>Kelola proyek pembelajaran berbasis PBL, kelas, kelompok, dan hasil belajar siswa dalam satu platform.</p>
          </div>
          <div className="cv-login-illustration">
            <img src="/images/civic-vision-hero.png" alt="Ilustrasi pembelajaran digital CIVIC VISION" />
          </div>
        </div>

        <section className="cv-login-form-panel" aria-labelledby="cv-login-title">
          <div className="cv-login-heading">
            <span className="cv-login-heading-icon"><CapIcon /></span>
            <div><span className="cv-login-form-eyebrow">RUANG KERJA PENDIDIK</span><h2 id="cv-login-title">Login Guru</h2><p>Masuk untuk mengelola proyek LKPD, kelas, dan hasil belajar siswa.</p></div>
          </div>

          {err && <div className="cv-login-error" role="alert" aria-live="polite">{err}</div>}

          <form className="cv-login-form" onSubmit={(event) => { event.preventDefault(); void go(); }}>
            <label className="cv-login-field">
              <span className="cv-login-field-icon"><MailIcon /></span>
              <span className="cv-login-sr-only">Email</span>
              <input id="em" name="email" type="email" autoComplete="username" placeholder="Email" value={em} onChange={(event) => setEm(event.target.value)} required />
            </label>

            <label className="cv-login-field">
              <span className="cv-login-field-icon"><LockIcon /></span>
              <span className="cv-login-sr-only">Kata sandi</span>
              <input id="pw" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Kata sandi" value={pw} onChange={(event) => setPw(event.target.value)} required />
              <button className="cv-login-password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={showPassword}><EyeIcon visible={showPassword} /></button>
            </label>

            <button className="cv-login-submit" type="submit" disabled={busy}>
              <span>{busy ? "MEMERIKSA..." : "MASUK"}</span>
              {!busy && <span aria-hidden="true">→</span>}
              {busy && <span className="cv-login-spinner" aria-hidden="true" />}
            </button>
          </form>
          <p className="cv-login-login-note">Gunakan akun guru yang telah terdaftar untuk mengakses ruang kerja.</p>
        </section>
      </section>
    </main>
  );
}

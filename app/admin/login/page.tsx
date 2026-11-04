"use client";

import { useEffect, useState } from "react";
import "@/app/admin/login/login.css";
import { sb } from "@/lib/supabase";

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v3" />
    </svg>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {visible ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 5.2A11.7 11.7 0 0 1 12 5c5.2 0 9 4.6 10 7-.4 1-1.4 2.4-2.8 3.6" />
          <path d="M6.2 6.2C3.9 7.7 2.5 10 2 12c1 2.4 4.8 7 10 7 1.2 0 2.3-.2 3.3-.7" />
        </>
      ) : (
        <>
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function CapIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="m4 17 20-10 20 10-20 10L4 17Z" />
      <path d="M12 21v11c7 6 17 6 24 0V21" />
      <path d="M44 18v13" />
    </svg>
  );
}

export default function Login() {
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.has("denied")) setErr("Akun ini tidak memiliki akses guru.");
    if (query.get("config") === "unavailable") {
      setErr("Layanan backend belum dikonfigurasi. Login tidak tersedia saat ini.");
    }
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
        if (error.message === "Backend configuration is unavailable.") {
          return setErr("Layanan backend belum dikonfigurasi. Login tidak tersedia saat ini.");
        }
        return setErr("Email atau kata sandi salah.");
      }
      location.href = "/admin";
    } catch {
      setBusy(false);
      setErr("Layanan backend belum dapat dihubungi. Coba lagi nanti.");
    }
  };

  return (
    <main className="cv-login-page">
      <div className="cv-login-orb cv-login-orb-one" aria-hidden="true" />
      <div className="cv-login-orb cv-login-orb-two" aria-hidden="true" />
      <div className="cv-login-wave cv-login-wave-one" aria-hidden="true" />
      <div className="cv-login-wave cv-login-wave-two" aria-hidden="true" />

      <div className="cv-login-content">
        <div className="cv-login-brand" aria-label="CIVIC VISION, LKPD Digital">
          <span className="cv-login-brand-mark" aria-hidden="true">C</span>
          <span className="cv-login-brand-copy">
            <strong>CIVIC VISION</strong>
            <small>LKPD Digital</small>
          </span>
        </div>

        <section className="cv-login-card" aria-labelledby="cv-login-title">
          <div className="cv-login-heading">
            <span className="cv-login-heading-icon"><CapIcon /></span>
            <div>
              <h1 id="cv-login-title">Login Guru</h1>
              <p>Masuk untuk mengelola proyek LKPD, kelas, dan hasil belajar.</p>
            </div>
          </div>

          {err && <div className="cv-login-error" role="alert" aria-live="polite">{err}</div>}

          <form
            className="cv-login-form"
            onSubmit={(event) => {
              event.preventDefault();
              void go();
            }}
          >
            <label className="cv-login-field">
              <span className="cv-login-field-icon"><MailIcon /></span>
              <span className="cv-login-sr-only">Email</span>
              <input
                id="em"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="Email"
                value={em}
                onChange={(event) => setEm(event.target.value)}
                required
              />
            </label>

            <label className="cv-login-field">
              <span className="cv-login-field-icon"><LockIcon /></span>
              <span className="cv-login-sr-only">Kata sandi</span>
              <input
                id="pw"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Kata sandi"
                value={pw}
                onChange={(event) => setPw(event.target.value)}
                required
              />
              <button
                className="cv-login-password-toggle"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                aria-pressed={showPassword}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </label>

            <button className="cv-login-submit" type="submit" disabled={busy}>
              <span>{busy ? "MEMERIKSA..." : "MASUK"}</span>
              {!busy && <span aria-hidden="true">→</span>}
              {busy && <span className="cv-login-spinner" aria-hidden="true" />}
            </button>
          </form>
        </section>
        <p className="cv-login-footnote">Ruang kerja pembelajaran digital CIVIC VISION</p>
      </div>
    </main>
  );
}

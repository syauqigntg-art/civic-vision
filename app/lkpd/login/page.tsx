"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function StudentLoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/student-auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ loginId, pin }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Login gagal.");
      localStorage.setItem("cv_code", "CV-SESSION-0001");
      router.replace("/lkpd/identitas");
    } catch (e) { setError(e instanceof Error ? e.message : "Tidak dapat masuk."); }
    finally { setBusy(false); }
  }
  return <main className="cv-auth-page">
    <section className="cv-auth-card">
      <div className="cv-auth-intro">
        <span className="cv-auth-eyebrow">CIVIC VISION · UNTUK SISWA</span>
        <h1>Login Siswa</h1>
        <span className="cv-auth-accent" />
        <p>Masuk untuk melanjutkan pembelajaran, mengakses LKPD, dan mengerjakan aktivitas PBL bersama kelompok.</p>
        <div className="cv-auth-art" aria-hidden="true">
          <div className="cv-auth-art-orbit cv-auth-art-orbit-one" />
          <div className="cv-auth-art-orbit cv-auth-art-orbit-two" />
          <div className="cv-auth-art-symbol">CV</div>
          <span className="cv-auth-art-caption">LEARNING · COLLABORATION · ACTION</span>
        </div>
      </div>
      <div className="cv-auth-form-side">
        <div className="cv-auth-form-heading">
          <div className="cv-auth-icon" aria-hidden="true">♙</div>
          <div><span className="cv-auth-eyebrow">RUANG BELAJAR SISWA</span><h2>Masuk ke Civic Vision</h2><p>Gunakan ID siswa dan PIN pribadi yang diberikan oleh guru.</p></div>
        </div>
        <form onSubmit={submit} className="cv-auth-form">
          <label htmlFor="student-login-id">ID Siswa</label>
          <div className="cv-auth-input-wrap"><span aria-hidden="true">♙</span><input id="student-login-id" value={loginId} onChange={e => setLoginId(e.target.value)} autoComplete="username" placeholder="Masukkan ID siswa" required maxLength={32} /></div>
          <label htmlFor="student-login-pin">PIN</label>
          <div className="cv-auth-input-wrap"><span aria-hidden="true">♙</span><input id="student-login-pin" value={pin} onChange={e => setPin(e.target.value.replace(/\\D/g, "").slice(0, 12))} type="password" inputMode="numeric" autoComplete="current-password" placeholder="Masukkan PIN" required minLength={6} /></div>
          {error && <p role="alert" className="cv-auth-error">{error}</p>}
          <button type="submit" disabled={busy || !loginId.trim() || pin.length < 6} className="cv-auth-submit">{busy ? "MEMERIKSA..." : "MASUK →"}</button>
          <p className="cv-auth-help">Gunakan akun siswa yang telah didaftarkan oleh guru untuk mengakses ruang belajar.</p>
        </form>
      </div>
    </section>
  </main>;
}

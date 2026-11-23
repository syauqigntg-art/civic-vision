"use client";

import "@/app/lkpd/identitas/identitas.css";
import { setCode } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function StudentGroupLogin() {
  const router = useRouter();
  const [code, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const normalized = code.trim().toUpperCase();

    try {
      const response = await fetch("/api/student/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Kode kelompok tidak dapat digunakan.");
        return;
      }
      setCode(normalized);
      router.replace("/lkpd/kasus");
    } catch {
      setError("Koneksi bermasalah. Periksa internet lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="cv-group-access-page">
      <section className="cv-group-access-panel" aria-labelledby="group-access-title">
        <div className="cv-group-access-emblem" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <rect x="7" y="10" width="34" height="28" rx="7" stroke="currentColor" strokeWidth="2.2" />
            <path d="M16 24h16M24 17v14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
        <span className="cv-group-access-eyebrow">RUANG BELAJAR CIVIC VISION</span>
        <h1 id="group-access-title">Masuk dengan <span>Kode Kelompok</span></h1>
        <p className="cv-group-access-description">
          Masukkan kode kelompok yang diberikan oleh guru untuk membuka proyek dan aktivitas belajar kelompokmu.
        </p>
        <form onSubmit={submit} className="cv-group-access-form">
          <label className="cv-group-access-label" htmlFor="group-code">KODE KELOMPOK</label>
          <div className="cv-group-code-field">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.7" />
              <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <input
              id="group-code"
              name="code"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="CV-XXXXXXXX"
              value={code}
              onChange={(event) => setValue(event.target.value.toUpperCase())}
              required
              minLength={6}
              maxLength={24}
              aria-describedby={error ? "group-code-error" : undefined}
            />
          </div>
          {error && <p id="group-code-error" role="alert" className="cv-group-access-error">{error}</p>}
          <button className="cv-group-access-submit" type="submit" disabled={loading || !code.trim()}>
            {loading ? "MEMVERIFIKASI..." : "MASUK KE KELOMPOK"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <div className="cv-group-access-footnote">Cukup satu kode kelompok untuk masuk.</div>
      </section>
    </main>
  );
}

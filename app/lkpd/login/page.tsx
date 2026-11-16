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
      router.replace("/lkpd/identitas");
    } catch (e) { setError(e instanceof Error ? e.message : "Tidak dapat masuk."); }
    finally { setBusy(false); }
  }
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--background, #f4f7fb)" }}>
    <section style={{ width: "min(100%, 430px)", padding: 32, borderRadius: 24, background: "white", boxShadow: "0 18px 60px #102a4318" }}>
      <p style={{ letterSpacing: ".16em", fontSize: 12, fontWeight: 700, color: "#3972a8" }}>CIVIC VISION · RUANG SISWA</p>
      <h1 style={{ fontSize: 30, margin: "12px 0 8px", color: "#142c45" }}>Masuk ke LKPD</h1>
      <p style={{ color: "#526579", lineHeight: 1.6 }}>Gunakan ID siswa dan PIN pribadi yang diberikan oleh guru.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 24 }}>
        <label style={{ display: "grid", gap: 7, fontWeight: 600, color: "#243b53" }}>ID Siswa
          <input value={loginId} onChange={e => setLoginId(e.target.value)} autoComplete="username" required maxLength={32} style={{ padding: 14, border: "1px solid #cbd5e1", borderRadius: 12 }} />
        </label>
        <label style={{ display: "grid", gap: 7, fontWeight: 600, color: "#243b53" }}>PIN
          <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 12))} type="password" inputMode="numeric" autoComplete="current-password" required minLength={6} style={{ padding: 14, border: "1px solid #cbd5e1", borderRadius: 12 }} />
        </label>
        {error && <p role="alert" style={{ color: "#b42318", margin: 0 }}>{error}</p>}
        <button disabled={busy || !loginId.trim() || pin.length < 6} style={{ border: 0, borderRadius: 12, padding: 15, background: "#145b91", color: "white", fontWeight: 700, cursor: "pointer", opacity: busy ? .65 : 1 }}>{busy ? "MEMERIKSA..." : "MASUK"}</button>
      </form>
      <p style={{ color: "#718096", fontSize: 13, marginTop: 18 }}>Belum memiliki ID atau lupa PIN? Hubungi guru untuk mendapatkan atau mengatur ulang kredensial.</p>
    </section>
  </main>;
}

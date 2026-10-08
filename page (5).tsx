"use client"; import { useEffect, useState } from "react"; import { sb } from "@/lib/supabase";
export default function Login() {
  const [em, setEm] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (location.search.includes("denied")) setErr("Akun ini tidak memiliki akses guru."); }, []);
  const go = async () => { if (!em.trim() || !pw) return setErr("Isi email dan kata sandi."); setBusy(true); const { error } = await sb.auth.signInWithPassword({ email: em.trim(), password: pw });
    if (error) { setBusy(false); return setErr("Email atau kata sandi salah."); } location.href = "/admin"; };
  return (<section className="glass" style={{ maxWidth: 440, margin: "40px auto" }}><h2>Login guru</h2>{err && <div className="warn" role="alert">{err}</div>}<label htmlFor="em">Email</label><input id="em" type="email" value={em} onChange={e => setEm(e.target.value)} />
    <label htmlFor="pw">Kata sandi</label><input id="pw" type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} /><div className="row"><button className="btn" disabled={busy} onClick={go}>{busy ? "Memeriksa..." : "MASUK →"}</button></div></section>);
}

"use client"; import { useEffect, useState } from "react"; import { useInView } from "@/hooks/useInView"; import { signedUrl } from "@/lib/api/media";
// Lazy: URL baru diminta saat elemen mendekati layar. preload="metadata": video tidak diunduh penuh; browser memakai HTTP range (streaming).
export function MediaPlayer({ path, poster, kind, alt = "" }: { path?: string | null; poster?: string | null; kind: "video" | "image"; alt?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>(); const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(false); const [n, setN] = useState(0);
  useEffect(() => { if (!path || !seen) return; setErr(false); setU(""); signedUrl(path).then(setU).catch(() => setErr(true)); if (poster) signedUrl(poster).then(setP).catch(() => {}); }, [path, poster, seen, n]);
  if (!path) return null;
  return (<div ref={ref}>{err ? <div className="warn" role="alert">{kind === "video" ? "Video tidak dapat dimuat. Silakan coba kembali." : "Gambar tidak dapat dimuat."} <button type="button" className="btn g" style={{ padding: "4px 14px", marginLeft: 8 }} onClick={() => setN(n + 1)}>Coba lagi</button></div>
    : !u ? <div className="novid" aria-busy="true">Memuat...</div>
    : kind === "video" ? <video src={u} poster={p || undefined} controls playsInline preload="metadata" aria-label={alt || "Video kasus"} onError={() => setErr(true)} />
    : <img src={u} alt={alt} loading="lazy" decoding="async" style={{ maxWidth: 200, borderRadius: 14 }} onError={() => setErr(true)} />}</div>); }

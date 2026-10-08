"use client"; import { useId, useState } from "react"; import { uploadFile, checkFile } from "@/lib/storage/upload"; import { MediaPlayer } from "@/components/video/MediaPlayer";
export function Uploader({ kind, onUrl, label }: { kind: "video" | "image"; onUrl: (path: string) => void | Promise<void>; label?: string }) {
  const id = useId(); const [pct, setPct] = useState<number | null>(null); const [msg, setMsg] = useState(""); const [url, setUrl] = useState("");
  const pick = async (f?: File) => { if (!f) return; const e = checkFile(f, kind); if (e) return setMsg(e); setMsg("Uploading..."); setPct(0);
    try { const u = await uploadFile(f, `${kind === "video" ? "v" : "thumbs"}/${crypto.randomUUID()}.${f.name.split(".").pop()}`, setPct); setUrl(u); setMsg(kind === "video" ? "✓ Video berhasil diupload" : "✓ Gambar berhasil diupload"); await onUrl(u); } catch (x: any) { setMsg(x.message); } setPct(null); };
  return (<div><input id={id} aria-label={label || (kind === "video" ? "Pilih file video" : "Pilih file gambar")} type="file" accept={kind === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp"} onChange={e => pick(e.target.files?.[0])} />
    {pct !== null && <><div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{ width: pct + "%" }} /></div><small>Uploading... {pct}%</small></>}
    <p role="status" style={{ margin: "6px 0" }}>{pct === null ? msg : ""}</p>{url && <MediaPlayer path={url} kind={kind} alt="Pratinjau thumbnail" />}</div>); }

"use client"; import { useEffect, useState } from "react"; import Link from "next/link"; import { usePathname, useRouter } from "next/navigation"; import { sb } from "@/lib/supabase";
const NAV = [["/admin", "Dashboard"], ["/admin/project", "Project"], ["/admin/videos", "Video Kasus"], ["/admin/questions", "Pertanyaan"], ["/admin/groups", "Kelompok"], ["/admin/submissions", "Jawaban Siswa"], ["/admin/settings", "Pengaturan"]];
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const r = useRouter(); const [ok, setOk] = useState(false);
  useEffect(() => { if (path === "/admin/login") return; // lapis kedua setelah middleware
    sb.auth.getUser().then(async x => { if (!x.data.user) return r.replace("/admin/login"); const q = await sb.from("users").select("role").eq("id", x.data.user.id).single(); if (q.data?.role !== "admin") return r.replace("/admin/login?denied=1"); setOk(true); }); }, [path, r]);
  if (path === "/admin/login") return <>{children}</>;
  if (!ok) return <section className="glass"><p>Memeriksa akses...</p></section>;
  return (<div className="adm"><nav aria-label="Menu admin" className="glass side">{NAV.map(([h, t]) => <Link key={h} href={h} className={"navlink" + (path === h ? " on" : "")} aria-current={path === h ? "page" : undefined}>{t}</Link>)}</nav><div>{children}</div></div>);
}

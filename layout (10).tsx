import "./globals.css"; import Link from "next/link";
export const metadata = { title: "CIVIC VISION — LKPD Digital" };
export default function L({ children }: { children: React.ReactNode }) {
  return (<html lang="id"><body><a className="skip" href="#konten">Lewati ke konten</a><div className="page">
    <header className="glass top"><div><b style={{ letterSpacing: ".06em" }}>CIVIC VISION</b><div style={{ fontSize: 12, opacity: .85 }}>LKPD Digital</div></div>
    <nav aria-label="Navigasi utama"><Link href="/">Beranda</Link><Link href="/lkpd/kasus">Video Kasus</Link><Link href="/lkpd/identitas">LKPD</Link><Link href="/admin">Guru</Link></nav></header>
    <main id="konten" tabIndex={-1}>{children}</main></div></body></html>);
}

import type { SaveState } from "@/hooks/useAutosave";

const LABELS: Record<SaveState, string> = {
  idle: "",
  saving: "Menyimpan jawaban…",
  saved: "✓ Semua jawaban tersimpan",
  offline:
    "Salinan sementara disimpan di perangkat dan akan dicoba lagi saat koneksi kembali. Jangan muat ulang sampai status tersimpan.",
  failed:
    "Server belum menerima jawaban. Periksa koneksi, lalu tunggu hingga status Tersimpan sebelum meninggalkan halaman.",
  "storage-error":
    "Penyimpanan sementara browser gagal. Jangan muat ulang halaman; pulihkan koneksi dan coba simpan kembali.",
  locked:
    "Pengerjaan sudah terkunci. Perubahan yang belum tersimpan ditolak server.",
};

const TITLES: Partial<Record<SaveState, string>> = {
  saving: "Menyimpan jawaban…",
  saved: "Jawaban berhasil tersimpan",
  offline: "⚠ KONEKSI TERPUTUS — JAWABAN BELUM TERKIRIM",
  failed: "⚠ GAGAL MENYIMPAN JAWABAN",
  "storage-error": "⚠ JAWABAN BELUM AMAN DISIMPAN",
  locked: "Pengerjaan terkunci",
};

export function SaveStatus({ st }: { st: SaveState }) {
  if (st === "idle") return null;

  const isProblem =
    st === "offline" || st === "failed" || st === "storage-error";
  const palette = isProblem
    ? {
        background: "#7f1d1d",
        border: "1px solid #fecaca",
        color: "#ffffff",
      }
    : st === "saved"
      ? {
          background: "#14532d",
          border: "1px solid #86efac",
          color: "#ffffff",
        }
      : st === "locked"
        ? {
            background: "#78350f",
            border: "1px solid #fde68a",
            color: "#ffffff",
          }
        : {
            background: "#1e3a8a",
            border: "1px solid #bfdbfe",
            color: "#ffffff",
          };

  return (
    <div
      role={isProblem ? "alert" : "status"}
      aria-live={isProblem ? "assertive" : "polite"}
      aria-atomic="true"
      style={{
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        margin: "12px 0",
        padding: "12px 14px",
        borderRadius: 14,
        lineHeight: 1.5,
        fontSize: 14,
        fontWeight: 700,
        overflowWrap: "anywhere",
        boxShadow: isProblem ? "0 4px 18px rgba(0,0,0,.28)" : undefined,
        ...palette,
      }}
    >
      <div>{TITLES[st]}</div>
      {LABELS[st] && (
        <div style={{ fontWeight: 500, marginTop: 3 }}>{LABELS[st]}</div>
      )}
    </div>
  );
}

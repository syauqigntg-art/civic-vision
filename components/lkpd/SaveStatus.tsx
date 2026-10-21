import type { SaveState } from "@/hooks/useAutosave";

const LABELS: Partial<Record<SaveState, string>> = {
  idle: "",
  saving: "Menyimpan jawaban…",
  saved: "✓ Semua jawaban tersimpan",
  offline:
    "Koneksi terputus. Jawaban belum terkirim; salinan sementara tersimpan di perangkat dan akan dicoba lagi saat online.",
  failed:
    "Gagal menyimpan ke server. Jawaban masih menunggu; coba Simpan draft dan jangan muat ulang sampai status Tersimpan.",
  "storage-error":
    "Jawaban belum tersimpan ke server dan penyimpanan sementara browser gagal. Jangan muat ulang; pulihkan koneksi lalu coba Simpan draft.",
  locked:
    "Pengerjaan sudah terkunci. Perubahan yang belum tersimpan ditolak server.",
};

export function SaveStatus({ st }: { st: SaveState }) {
  const label = LABELS[st];
  if (!label) return null;

  const isProblem =
    st === "offline" || st === "failed" || st === "storage-error";
  return (
    <span
      role="status"
      aria-live="polite"
      style={{
        color: isProblem ? "#b91c1c" : st === "saved" ? "#15803d" : undefined,
        fontWeight: isProblem || st === "saved" ? 600 : 400,
      }}
    >
      {label}
    </span>
  );
}

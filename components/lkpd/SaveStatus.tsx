import type { SaveState } from "@/hooks/useAutosave";

type StatusPresentation = {
  label: string;
  icon: string;
  detail: string;
  tone: "pending" | "success" | "warning" | "error" | "locked";
};

const PRESENTATION: Partial<Record<SaveState, StatusPresentation>> = {
  saving: {
    label: "Menyimpan…",
    icon: "↻",
    detail: "Jawaban sedang dikirim ke server.",
    tone: "pending",
  },
  saved: {
    label: "Tersimpan",
    icon: "✓",
    detail: "Semua jawaban berhasil tersimpan di server.",
    tone: "success",
  },
  offline: {
    label: "Offline · belum terkirim",
    icon: "!",
    detail:
      "Salinan sementara disimpan di perangkat dan akan dicoba lagi saat koneksi kembali. Jangan muat ulang sampai status tersimpan.",
    tone: "warning",
  },
  failed: {
    label: "Gagal menyimpan",
    icon: "!",
    detail:
      "Server belum menerima jawaban. Periksa koneksi, lalu tunggu hingga status Tersimpan sebelum meninggalkan halaman.",
    tone: "error",
  },
  "storage-error": {
    label: "Penyimpanan lokal gagal",
    icon: "!",
    detail:
      "Penyimpanan sementara browser gagal. Jangan muat ulang halaman; pulihkan koneksi dan coba simpan kembali.",
    tone: "error",
  },
  locked: {
    label: "Terkunci",
    icon: "✓",
    detail:
      "Pengerjaan sudah terkunci. Perubahan yang belum tersimpan ditolak server.",
    tone: "locked",
  },
};

export function SaveStatus({ st }: { st: SaveState }) {
  const status = PRESENTATION[st];
  if (!status) return null;

  const isProblem =
    status.tone === "warning" || status.tone === "error";

  return (
    <span
      className={`cv-save-status is-${status.tone}`}
      role={isProblem ? "alert" : "status"}
      aria-live={isProblem ? "assertive" : "polite"}
      aria-atomic="true"
      aria-label={status.detail}
      title={status.detail}
    >
      <span className="cv-save-status-icon" aria-hidden="true">
        {status.icon}
      </span>
      <span className="cv-save-status-label">{status.label}</span>
    </span>
  );
}

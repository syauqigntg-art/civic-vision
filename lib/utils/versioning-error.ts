export type VersioningOperation = "load" | "save" | "validate" | "publish";

type BackendError = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

type VersioningErrorKind =
  | "project_archived"
  | "project_not_found"
  | "table_missing"
  | "table_schema_cache"
  | "rpc_unavailable"
  | "schema_cache_mismatch"
  | "permission"
  | "network"
  | "unknown";

function errorFields(error: unknown) {
  const candidate = (error && typeof error === "object" ? error : {}) as BackendError;
  return {
    code: String(candidate.code ?? "").toUpperCase(),
    message: String(candidate.message ?? error ?? "").toLowerCase(),
    status: Number(candidate.status ?? candidate.statusCode ?? 0),
  };
}

export function classifyVersioningError(error: unknown): VersioningErrorKind {
  const { code, message, status } = errorFields(error);

  if (message.includes("project_archived")) return "project_archived";
  if (message.includes("project_not_found") || message.includes("project_content_not_found")) {
    return "project_not_found";
  }

  if (
    code === "42P01" ||
    /relation\s+["']?(public\.)?project_versions["']?\s+does not exist/.test(message) ||
    /table\s+["']?(public\.)?project_versions["']?\s+does not exist/.test(message)
  ) {
    return "table_missing";
  }

  if (
    code === "PGRST202" ||
    /could not find the function/.test(message) ||
    (/function/.test(message) && /schema cache/.test(message))
  ) {
    return "rpc_unavailable";
  }

  if (
    code === "PGRST205" ||
    (/schema cache/.test(message) && /project_versions/.test(message))
  ) {
    return "table_schema_cache";
  }

  if (code === "PGRST204" || code === "42703" || /column .* does not exist/.test(message)) {
    return "schema_cache_mismatch";
  }

  if (
    code === "42501" ||
    status === 401 ||
    status === 403 ||
    message.includes("admin_required") ||
    /permission denied|row-level security|rls policy|not authorized|insufficient privilege/.test(message)
  ) {
    return "permission";
  }

  if (
    error instanceof TypeError ||
    status === 0 ||
    /failed to fetch|networkerror|network request failed|load failed|fetch failed|connection reset|timeout/.test(message)
  ) {
    return "network";
  }

  return "unknown";
}

export function versioningErrorMessage(error: unknown, operation: VersioningOperation): string {
  switch (classifyVersioningError(error)) {
    case "project_archived":
      return "Proyek sudah diarsipkan. Aktifkan kembali proyek sebelum mengubah atau menerbitkan snapshot.";
    case "project_not_found":
      return "Proyek tidak ditemukan atau tidak lagi tersedia. Muat ulang daftar proyek dan pilih proyek yang valid.";
    case "table_missing":
      return "Tabel project_versions tidak ditemukan pada database. Migration versioning belum lengkap; hentikan publikasi dan minta maintainer memeriksa schema.";
    case "table_schema_cache":
      return "PostgREST tidak menemukan tabel project_versions di schema cache. Ini bisa berarti tabel belum dibuat atau cache belum diperbarui; verifikasi katalog database untuk membedakannya sebelum mencoba lagi.";
    case "rpc_unavailable":
      return "RPC versioning tidak tersedia atau signature-nya tidak cocok dengan aplikasi. Cocokkan definisi RPC dengan migration dan periksa PostgREST schema cache.";
    case "schema_cache_mismatch":
      return "Kolom atau struktur database tidak cocok dengan schema cache aplikasi. Periksa migration dan refresh schema cache sebelum mencoba lagi.";
    case "permission":
      return "Operasi ditolak oleh izin database/RLS atau pemeriksaan private.is_admin(). Pastikan akun guru/admin benar dan hak akses migration sesuai.";
    case "network":
      return "Koneksi ke database gagal. Periksa jaringan lalu muat ulang; status operasi belum dapat dipastikan sampai data dibaca kembali.";
    default:
      return operation === "load"
        ? "Riwayat versi gagal dimuat karena kesalahan database yang belum teridentifikasi. Muat ulang dan periksa log server tanpa membagikan secret."
        : "Operasi versioning gagal karena kesalahan database yang belum teridentifikasi. Periksa status riwayat versi sebelum mengulangi tindakan.";
  }
}

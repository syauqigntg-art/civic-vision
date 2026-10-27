export type SafeSupabaseDiagnostic = {
  category: "schema_mismatch" | "query_failed";
  code: string;
};

const SCHEMA_ERROR_CODES = new Set([
  "42703", // undefined_column
  "42P01", // undefined_table
  "PGRST200",
  "PGRST201",
  "PGRST202",
  "PGRST204",
  "PGRST205",
]);

/**
 * Returns only a bounded database error code and a broad category.
 * Never returns provider messages, query values, tokens, IDs, or row data.
 */
export function safeSupabaseDiagnostic(error: unknown): SafeSupabaseDiagnostic {
  const candidate = error && typeof error === "object" && "code" in error
    ? (error as { code?: unknown }).code
    : undefined;
  const code = typeof candidate === "string" && /^[A-Z0-9]{4,8}$/.test(candidate)
    ? candidate
    : "unknown";
  return {
    category: SCHEMA_ERROR_CODES.has(code) ? "schema_mismatch" : "query_failed",
    code,
  };
}

import { SupabaseConfigurationError } from "./config-error.ts";

export type PublicSupabaseConfig = { url: string; anonKey: string };

export function readPublicSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
): PublicSupabaseConfig {
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !anonKey || !isValidSupabaseUrl(url) || anonKey.length < 20) {
    throw new SupabaseConfigurationError();
  }
  return { url, anonKey };
}

export function isPublicSupabaseConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  try { readPublicSupabaseConfig(env); return true; } catch { return false; }
}

function isValidSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

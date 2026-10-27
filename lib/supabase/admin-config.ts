import "server-only";
import { SupabaseConfigurationError } from "@/lib/supabase/config-error";

export type AdminSupabaseConfig = { url: string; serviceRoleKey: string };

export function readAdminSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
): AdminSupabaseConfig {
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceRoleKey = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  let validUrl = false;
  try {
    const parsed = new URL(url);
    validUrl = parsed.protocol === "https:" && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch { validUrl = false; }
  if (!validUrl || serviceRoleKey.length < 20) throw new SupabaseConfigurationError();
  return { url, serviceRoleKey };
}

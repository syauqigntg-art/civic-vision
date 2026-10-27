import { isPublicSupabaseConfigured } from "./public-config.ts";

export function isRuntimeBackendConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return isPublicSupabaseConfigured(env) && (env.SUPABASE_SERVICE_ROLE_KEY || "").trim().length >= 20;
}

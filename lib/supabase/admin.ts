import "server-only";
import { createClient } from "@supabase/supabase-js";
import { readAdminSupabaseConfig } from "@/lib/supabase/admin-config";

type AdminClient = ReturnType<typeof createClient>;
let client: AdminClient | undefined;

export function getAdminClient(): AdminClient {
  if (client) return client;
  const { url, serviceRoleKey } = readAdminSupabaseConfig(process.env);
  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

// Preserve current API route imports without creating a privileged client at
// module evaluation time. Access still fails closed when config is unavailable.
export const admin: AdminClient = new Proxy({} as AdminClient, {
  get(_target, property) {
    const realClient = getAdminClient();
    const value = Reflect.get(realClient, property, realClient);
    return typeof value === "function" ? value.bind(realClient) : value;
  },
});

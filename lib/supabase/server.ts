import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readPublicSupabaseConfig } from "@/lib/supabase/public-config";

export async function serverClient() {
  const { url, anonKey } = readPublicSupabaseConfig(process.env);
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; route handlers can.
        }
      },
    },
  });
}

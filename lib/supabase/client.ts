import { createBrowserClient } from "@supabase/ssr";
export const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); // sesi di cookie agar middleware bisa memeriksanya

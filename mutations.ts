import { sb } from "@/lib/supabase/client";
export const upd = (t: string, id: string, patch: any) => sb.from(t).update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);

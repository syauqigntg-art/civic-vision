import "server-only"; import { serverClient } from "@/lib/supabase/server";
export async function isAdminRequest() { const s = await serverClient(); const { data: { user } } = await s.auth.getUser(); if (!user) return false;
  const { data } = await s.from("users").select("role").eq("id", user.id).single(); return data?.role === "admin"; }

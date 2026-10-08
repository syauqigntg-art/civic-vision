import { createServerClient } from "@supabase/ssr"; import { NextResponse, type NextRequest } from "next/server";
// Penjaga server: /admin/* hanya untuk pengguna login dengan role admin (selain /admin/login).
export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const s = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => req.cookies.getAll(),
    setAll: l => { l.forEach(({ name, value }) => req.cookies.set(name, value)); res = NextResponse.next({ request: req }); l.forEach(({ name, value, options }) => res.cookies.set(name, value, options)); } } });
  const p = req.nextUrl.pathname; if (p === "/admin/login") return res;
  const { data: { user } } = await s.auth.getUser(); const to = (q = "") => NextResponse.redirect(new URL("/admin/login" + q, req.url));
  if (!user) return to();
  const { data } = await s.from("users").select("role").eq("id", user.id).single(); if (data?.role !== "admin") return to("?denied=1");
  return res;
}
export const config = { matcher: ["/admin/:path*"] };

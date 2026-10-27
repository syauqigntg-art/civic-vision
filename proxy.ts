import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicSupabaseConfigured, readPublicSupabaseConfig } from "@/lib/supabase/public-config";

const unavailable = () =>
  NextResponse.json({ error: "Layanan backend belum dikonfigurasi." }, { status: 503 });

// Protected routes fail closed when runtime configuration is missing or the
// identity/role check cannot be completed. No configuration failure grants access.
export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isApi = path.startsWith("/api/");
  const isLogin = path === "/admin/login";

  if (isApi) {
    const hasPublicConfig = isPublicSupabaseConfigured(process.env);
    const hasServiceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim().length >= 20;
    if (!hasPublicConfig || !hasServiceRole) return unavailable();
    return NextResponse.next();
  }

  if (isLogin) return NextResponse.next();

  const toLogin = (query = "") =>
    NextResponse.redirect(new URL("/admin/login" + query, req.url));

  if (!isPublicSupabaseConfigured(process.env)) {
    return toLogin("?config=unavailable");
  }

  let response = NextResponse.next({ request: req });
  try {
    const { url, anonKey } = readPublicSupabaseConfig(process.env);
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (values) => {
          values.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return toLogin();

    const { data: profile, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || profile?.role !== "admin") return toLogin("?denied=1");
    return response;
  } catch {
    return toLogin("?config=unavailable");
  }
}

export const config = { matcher: ["/admin/:path*", "/api/:path*"] };

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { isRuntimeBackendConfigured } from "../lib/supabase/runtime-status.ts";
import { isPublicSupabaseConfigured, readPublicSupabaseConfig } from "../lib/supabase/public-config.ts";
import { createUnavailableSupabaseClient } from "../lib/supabase/client.ts";
import { safeSupabaseDiagnostic } from "../lib/supabase/diagnostics.ts";

test("public Supabase configuration is reported unavailable when values are absent", () => {
  assert.equal(isPublicSupabaseConfigured({}), false);
  assert.throws(
    () => readPublicSupabaseConfig({}),
    (error) => error?.name === "SupabaseConfigurationError" &&
      error.message === "Backend configuration is unavailable.",
  );
});

test("invalid or incomplete public configuration fails closed without echoing values", () => {
  const secretLookingValue = "must-not-be-echoed-in-errors";
  assert.equal(isPublicSupabaseConfigured({
    NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: secretLookingValue,
  }), false);
  assert.throws(
    () => readPublicSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: secretLookingValue,
    }),
    (error) => !error.message.includes(secretLookingValue),
  );
});

test("strict operational env check remains available as a separate command", () => {
  const env = { ...process.env };
  delete env.NEXT_PUBLIC_SUPABASE_URL;
  delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  const result = spawnSync(process.execPath, ["scripts/check-env.mjs"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /runtime configuration is not ready/i);
  assert.doesNotMatch(result.stderr, /https:\/\/[^\s]+\.supabase\.co/);
});

test("build lifecycle does not run the strict environment check", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.scripts.prebuild, undefined);
  assert.equal(pkg.scripts.build, "next build");
  assert.equal(pkg.scripts["check:env"], "node scripts/check-env.mjs");
});

test("protected admin and API requests fail closed without public config", async () => {
  const proxy = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
  assert.match(proxy, /if \(isApi\)[\s\S]*?if \(!isRuntimeBackendConfigured\(process\.env\)\) return unavailable\(\)/);
  assert.match(proxy, /if \(!isPublicSupabaseConfigured\(process\.env\)\)\s*\{\s*return toLogin\("\?config=unavailable"\)/);
  assert.match(proxy, /profile\?\.role !== "admin"/);
});

test("unavailable browser client never claims a user or successful query", async () => {
  const client = createUnavailableSupabaseClient();
  const query = await client.from("projects").select("*");
  assert.equal(query.data, null);
  assert.equal(query.error.message, "Backend configuration is unavailable.");

  const auth = await client.auth.getUser();
  assert.equal(auth.data.user, null);
  assert.equal(auth.error.message, "Backend configuration is unavailable.");

  const signIn = await client.auth.signInWithPassword({ email: "", password: "" });
  assert.equal(signIn.error.message, "Backend configuration is unavailable.");
});


test("runtime backend readiness fails closed when public or server configuration is absent", () => {
  assert.equal(isRuntimeBackendConfigured({}), false);
  assert.equal(isRuntimeBackendConfigured({
    NEXT_PUBLIC_SUPABASE_URL: undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
    SUPABASE_SERVICE_ROLE_KEY: undefined,
  }), false);
});


test("database diagnostics distinguish schema mismatch from query failure without exposing messages", () => {
  const secretLikeMessage = "access_code=DO_NOT_LOG service_role_secret";
  assert.deepEqual(safeSupabaseDiagnostic({ code: "42703", message: secretLikeMessage }), {
    category: "schema_mismatch",
    code: "42703",
  });
  assert.deepEqual(safeSupabaseDiagnostic({ code: "PGRST204", message: secretLikeMessage }), {
    category: "schema_mismatch",
    code: "PGRST204",
  });
  assert.deepEqual(safeSupabaseDiagnostic({ code: "42501", message: secretLikeMessage }), {
    category: "query_failed",
    code: "42501",
  });
  assert.doesNotMatch(JSON.stringify(safeSupabaseDiagnostic({ code: "42501", message: secretLikeMessage })), /DO_NOT_LOG|service_role_secret/);
});

test("student content uses live project/video/question tables without version schema", async () => {
  const route = await readFile(new URL("../app/api/student-content/route.ts", import.meta.url), "utf8");
  assert.match(route, /select\("id,is_active"\)/);
  assert.match(route, /select\("status,video_id"\)/);
  assert.match(route, /from\("questions"\)/);
  assert.match(route, /from\("videos"\)/);
  assert.match(route, /question_options\(\*\)/);
  assert.doesNotMatch(route, /project_versions|active_version_id|project_version_id/);
});


test("the shared layout visibly reports when browser Supabase config is absent", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /publicBackendConfigured/);
  assert.match(layout, /Layanan backend belum dikonfigurasi/);
  assert.match(layout, /data tidak akan disimulasikan/);
});

test("student content handles live-table lookup failures without echoing database details", async () => {
  const route = await readFile(new URL("../app/api/student-content/route.ts", import.meta.url), "utf8");
  assert.match(route, /Student content project\/submission lookup failed/);
  assert.match(route, /Konten proyek belum dapat diverifikasi/);
  assert.doesNotMatch(route, /safeSupabaseDiagnostic|project version snapshot lookup/i);
});

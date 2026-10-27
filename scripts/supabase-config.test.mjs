import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { isPublicSupabaseConfigured, readPublicSupabaseConfig } from "../lib/supabase/public-config.ts";

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
  assert.match(proxy, /if \(isApi\)[\s\S]*?if \(!hasPublicConfig \|\| !hasServiceRole\) return unavailable\(\)/);
  assert.match(proxy, /if \(!isPublicSupabaseConfigured\(process\.env\)\)\s*\{\s*return toLogin\("\?config=unavailable"\)/);
  assert.match(proxy, /profile\?\.role !== "admin"/);
});

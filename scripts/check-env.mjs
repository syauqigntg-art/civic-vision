// Strict operational readiness check. This is intentionally not a build lifecycle hook.
// Run explicitly with: npm run check:env
try { process.loadEnvFile(".env.local"); } catch {}

const required = [
  ["NEXT_PUBLIC_SUPABASE_URL", "HTTPS project URL"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "public/anon key"],
  ["SUPABASE_SERVICE_ROLE_KEY", "server-only service role key"],
];
const errors = [];

for (const [key, description] of required) {
  const value = (process.env[key] || "").trim();
  if (!value) {
    errors.push(`- ${key}: missing (${description})`);
    continue;
  }
  if (key === "NEXT_PUBLIC_SUPABASE_URL" && !/^https:\/\/[^\s"'=]+$/.test(value)) {
    errors.push(`- ${key}: must be a valid HTTPS URL`);
  } else if (key !== "NEXT_PUBLIC_SUPABASE_URL" && value.length < 20) {
    errors.push(`- ${key}: value is too short to be a valid key`);
  }
}

if (errors.length) {
  console.error("\n[CIVIC VISION] Backend runtime configuration is not ready:\n" +
    errors.join("\n") +
    "\n\nSet the required values in the deployment environment or local .env.local. Values are never printed.\n");
  process.exitCode = 1;
} else {
  console.log("[CIVIC VISION] Backend runtime configuration is present.");
}

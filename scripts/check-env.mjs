// Dijalankan otomatis sebelum "npm run build" (prebuild). Memberi pesan jelas jika variabel Supabase belum benar.
try { process.loadEnvFile(".env.local"); } catch {}
const need = [["NEXT_PUBLIC_SUPABASE_URL", "alamat project, contoh https://abcdefgh.supabase.co"], ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "kunci anon / public"], ["SUPABASE_SERVICE_ROLE_KEY", "kunci service_role (rahasia)"]];
const errs = [];
for (const [k, hint] of need) { const v = (process.env[k] || "").trim();
  if (!v) errs.push(`- ${k}: BELUM DIISI (${hint})`);
  else if (k === "NEXT_PUBLIC_SUPABASE_URL" && !/^https:\/\/[^\s"'=]+$/.test(v)) errs.push(`- ${k}: harus satu alamat yang diawali https:// tanpa tanda kutip, spasi, atau nama variabel. Terbaca: "${v.slice(0, 40)}"`);
  else if (k !== "NEXT_PUBLIC_SUPABASE_URL" && v.length < 20) errs.push(`- ${k}: terlalu pendek, kemungkinan salah tempel (${hint})`); }
if (errs.length) { console.error("\n[CIVIC VISION] Environment Variables belum benar:\n" + errs.join("\n") + "\n\nPerbaiki di Vercel: Settings → Environment Variables, lalu Redeploy. Lokal: isi .env.local.\n"); process.exit(1); }
console.log("[CIVIC VISION] Environment Variables OK.");

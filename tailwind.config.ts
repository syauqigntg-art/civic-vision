import type { Config } from "tailwindcss";
// Preflight dimatikan agar gaya Liquid Glass di globals.css tidak berubah; utilitas Tailwind tetap bisa dipakai di komponen.
export default { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], corePlugins: { preflight: false }, theme: { extend: {} }, plugins: [] } satisfies Config;

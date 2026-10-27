import "./globals.css";
import AppShell from "@/components/AppShell";

// Public Supabase values are compiled into browser code, so missing values at
// build time mean browser-backed features require a new build after configuration.
const publicBackendConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const metadata = {
  title: "CIVIC VISION — LKPD Digital",
  description: "Ruang pembelajaran digital untuk menganalisis nilai Pancasila dalam kehidupan sehari-hari.",
};

export default function L({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        {!publicBackendConfigured && (
          <div
            role="status"
            aria-live="polite"
            style={{
              padding: "10px 16px",
              background: "#fff4d6",
              color: "#624b00",
              borderBottom: "1px solid #e5cf8a",
              textAlign: "center",
              fontSize: 14,
            }}
          >
            Layanan backend belum dikonfigurasi. Fitur yang membutuhkan Supabase sementara tidak tersedia; data tidak akan disimulasikan.
          </div>
        )}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

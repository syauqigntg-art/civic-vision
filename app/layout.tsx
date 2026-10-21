import "./globals.css";
import AppShell from "@/components/AppShell";

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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}


import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata = {
  title: "CIVIC VISION — LKPD Digital",
};

export default function L({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <a className="skip" href="#konten">
          Lewati ke konten
        </a>

        <div className="page">
          <header className="glass top">
            <div>
              <b style={{ letterSpacing: ".06em" }}>
                CIVIC VISION
              </b>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                LKPD Digital
              </div>
            </div>

            <NavBar />
          </header>

          <main id="konten" tabIndex={-1}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

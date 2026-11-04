type BrandLogoProps = { variant?: "horizontal" | "mark"; tone?: "light" | "dark"; className?: string; tagline?: boolean; };

/** Shared CIVIC VISION identity. Keep all logo usage routed through this component. */
export default function BrandLogo({ variant = "horizontal", tone = "light", className = "", tagline = true }: BrandLogoProps) {
  const src = variant === "mark"
    ? "/brand/civic-vision-mark.svg"
    : tone === "dark"
      ? "/brand/civic-vision-horizontal-dark.svg"
      : "/brand/civic-vision-horizontal.svg";
  return (
    <img
      className={["cv-brand-logo", `cv-brand-logo--${variant}`, `cv-brand-logo--${tone}`, className].filter(Boolean).join(" ")}
      src={src}
      alt={variant === "mark" ? "CIVIC VISION" : tagline ? "CIVIC VISION — LKPD Digital" : "CIVIC VISION"}
      width={variant === "mark" ? 128 : 640}
      height={variant === "mark" ? 128 : 190}
      draggable={false}
    />
  );
}

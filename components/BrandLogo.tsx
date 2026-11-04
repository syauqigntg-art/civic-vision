import type { CSSProperties } from "react";

type BrandLogoProps = {
  variant?: "horizontal-light" | "horizontal-dark" | "symbol";
  className?: string;
  height?: number;
  alt?: string;
};

const sources = {
  "horizontal-light": "/brand/civic-vision-horizontal-light.svg",
  "horizontal-dark": "/brand/civic-vision-horizontal-dark.svg",
  symbol: "/brand/civic-vision-symbol.svg",
} as const;

/** Single reusable entry point for every CIVIC VISION brand mark. */
export default function BrandLogo({
  variant = "horizontal-light",
  className,
  height = variant === "symbol" ? 40 : 48,
  alt = "CIVIC VISION — LKPD Digital",
}: BrandLogoProps) {
  const style: CSSProperties = {
    display: "block",
    width: "auto",
    height,
    maxWidth: "100%",
    objectFit: "contain",
    flex: "0 0 auto",
  };

  return (
    <img
      src={sources[variant]}
      className={className}
      style={style}
      alt={alt}
      draggable={false}
    />
  );
}

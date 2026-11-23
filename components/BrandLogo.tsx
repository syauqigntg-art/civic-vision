import CivicVisionLogo from "@/components/branding/CivicVisionLogo";
type BrandLogoProps = { variant?: "horizontal-light" | "horizontal-dark" | "symbol"; className?: string; height?: number; alt?: string; };
/** Backward-compatible adapter; all brand rendering is owned by CivicVisionLogo. */
export default function BrandLogo({variant="horizontal-light",className,height,alt}:BrandLogoProps) {
 return <CivicVisionLogo variant={variant==="symbol"?"symbol":"horizontal"} tone={variant==="horizontal-dark"?"dark":"light"} className={className} height={height} alt={alt}/>;
}
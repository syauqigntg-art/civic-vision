import Image from "next/image";
type CivicVisionLogoProps = { variant?: "horizontal" | "symbol"; tone?: "light" | "dark"; height?: number; width?: number; className?: string; alt?: string; };
export default function CivicVisionLogo({ variant="horizontal", tone="light", height=variant==="symbol"?42:46, width, className, alt="CIVIC VISION — LKPD Digital" }: CivicVisionLogoProps) {
 const src=variant==="symbol"?"/brand/civic-vision-symbol.svg":tone==="light"?"/brand/civic-vision-logo-light.svg":"/brand/civic-vision-logo-dark.svg";
 const naturalWidth=variant==="symbol"?height:Math.round(height*(360/76));
 return <Image src={src} alt={alt} width={width??naturalWidth} height={height} className={className} unoptimized draggable={false} sizes={variant==="symbol"?`${height}px`:`(max-width: 700px) 205px, ${width??naturalWidth}px`} style={{display:"block",width:width??"auto",height,maxWidth:"100%",objectFit:"contain",flex:"0 0 auto"}} />;
}
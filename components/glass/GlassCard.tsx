export function GlassCard({ children, className = "", ...p }: React.HTMLAttributes<HTMLElement>) { return <section className={`glass ${className}`} {...p}>{children}</section>; }

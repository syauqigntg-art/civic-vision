"use client"; import { useEffect, useRef, useState } from "react";
export function useInView<T extends Element>() { const ref = useRef<T>(null); const [seen, setSeen] = useState(false);
  useEffect(() => { const el = ref.current; if (!el || seen) return; if (!("IntersectionObserver" in window)) { setSeen(true); return; }
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); o.disconnect(); } }, { rootMargin: "200px" }); o.observe(el); return () => o.disconnect(); }, [seen]); return [ref, seen] as const; }

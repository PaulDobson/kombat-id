"use client";

import { useEffect, useRef } from "react";

interface RevealOnScrollProps {
  children: React.ReactNode;
  className?: string;
  /** Extra delay in ms applied to each child via CSS custom property */
  staggerMs?: number;
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Wraps children in a container that fades + slides up when it enters the viewport.
 * Uses IntersectionObserver — no layout shift, no JS on server.
 */
export function RevealOnScroll({
  children,
  className = "",
  as: Tag = "div",
}: RevealOnScrollProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    // @ts-expect-error — dynamic tag is valid
    <Tag ref={ref} className={`reveal ${className}`}>
      {children}
    </Tag>
  );
}

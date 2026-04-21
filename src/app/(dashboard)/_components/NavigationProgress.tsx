"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathRef = useRef(pathname + searchParams.toString());

  // Detect navigation start via link clicks
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http")) return;
      // Same page — skip
      const current =
        pathname +
        (searchParams.toString() ? "?" + searchParams.toString() : "");
      if (href === current) return;
      startProgress();
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname, searchParams]);

  // Detect navigation complete
  useEffect(() => {
    const current = pathname + searchParams.toString();
    if (current !== prevPathRef.current) {
      prevPathRef.current = current;
      completeProgress();
    }
  }, [pathname, searchParams]);

  function startProgress() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setProgress(10);
    setVisible(true);

    let current = 10;
    intervalRef.current = setInterval(() => {
      // Slow down as it approaches 85%
      const increment =
        current < 30 ? 8 : current < 60 ? 4 : current < 80 ? 1.5 : 0.5;
      current = Math.min(current + increment, 85);
      setProgress(current);
    }, 200);
  }

  function completeProgress() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(100);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-[2px] pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-primary-500 transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

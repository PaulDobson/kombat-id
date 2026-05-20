"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

type NavDropdownItem =
  | { href: string; label: string; separator?: false }
  | { separator: true };

interface NavDropdownProps {
  label: string;
  items: NavDropdownItem[];
}

export function NavDropdown({ label, items }: NavDropdownProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isActive = items.some(
    (item) =>
      !item.separator &&
      (pathname === item.href || pathname.startsWith(item.href + "/")),
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-150 whitespace-nowrap",
          isActive
            ? "bg-primary-600/90 text-white shadow-sm shadow-primary-900/40"
            : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60",
        ].join(" ")}
      >
        {label}
        <svg
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-neutral-900/95 backdrop-blur-sm border border-neutral-700/60 rounded-lg shadow-xl shadow-black/40 py-1 min-w-40 z-50">
          {items.map((item, i) => {
            if (item.separator) {
              return (
                <div
                  key={`sep-${i}`}
                  className="my-1 mx-2 h-px bg-neutral-700/50"
                />
              );
            }
            const itemActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={[
                  "block px-3 py-2 text-xs font-medium transition-colors",
                  itemActive
                    ? "text-primary-400 bg-primary-900/30"
                    : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

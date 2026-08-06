"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export type NavDropdownSubItem = {
  href: string;
  label: string;
};

export type NavDropdownItem =
  | {
      href: string;
      label: string;
      subItems?: NavDropdownSubItem[];
      separator?: false;
    }
  | { separator: true };

interface NavDropdownProps {
  label: string;
  items: NavDropdownItem[];
}

/** A single top-level item that may expand a sub-menu on hover/click. */
function NestedItem({
  item,
  onClose,
}: {
  item: Extract<NavDropdownItem, { href: string }>;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [subOpen, setSubOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const itemActive =
    pathname === item.href || pathname.startsWith(item.href + "/");

  // Close sub-menu when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setSubOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!item.subItems?.length) {
    return (
      <Link
        href={item.href}
        onClick={onClose}
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
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setSubOpen((v) => !v)}
        className={[
          "w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium transition-colors",
          itemActive || subOpen
            ? "text-primary-400 bg-primary-900/30"
            : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800",
        ].join(" ")}
      >
        {item.label}
        <svg
          className={`w-3 h-3 shrink-0 transition-transform ${subOpen ? "-rotate-90" : "rotate-90"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {subOpen && (
        <div className="absolute left-full top-0 ml-1 bg-neutral-900/95 backdrop-blur-sm border border-neutral-700/60 rounded-lg shadow-xl shadow-black/40 py-1 min-w-44 z-50">
          {/* Link to the parent page itself */}
          <Link
            href={item.href}
            onClick={() => {
              setSubOpen(false);
              onClose();
            }}
            className={[
              "block px-3 py-2 text-xs font-medium transition-colors",
              pathname === item.href ||
              (pathname.startsWith(item.href + "/") &&
                !item.subItems.some((s) => pathname.startsWith(s.href)))
                ? "text-primary-400 bg-primary-900/30"
                : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800",
            ].join(" ")}
          >
            Ver academia
          </Link>
          <div className="my-1 mx-2 h-px bg-neutral-700/50" />
          {item.subItems.map((sub) => {
            const subActive =
              pathname === sub.href || pathname.startsWith(sub.href + "/");
            return (
              <Link
                key={sub.href}
                href={sub.href}
                onClick={() => {
                  setSubOpen(false);
                  onClose();
                }}
                className={[
                  "block px-3 py-2 text-xs font-medium transition-colors",
                  subActive
                    ? "text-primary-400 bg-primary-900/30"
                    : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800",
                ].join(" ")}
              >
                {sub.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
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
        <div className="absolute top-full left-0 mt-1.5 bg-neutral-900/95 backdrop-blur-sm border border-neutral-700/60 rounded-lg shadow-xl shadow-black/40 py-1 min-w-44 z-50">
          {items.map((item, i) => {
            if (item.separator) {
              return (
                <div
                  key={`sep-${i}`}
                  className="my-1 mx-2 h-px bg-neutral-700/50"
                />
              );
            }
            return (
              <NestedItem
                key={item.href}
                item={item}
                onClose={() => setOpen(false)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

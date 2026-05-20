"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

interface UserMenuProps {
  profileHref: string;
  name: string;
  gradeLabel: string | null;
  initials: string | null;
  signOutAction: () => Promise<void>;
}

export function UserMenu({
  profileHref,
  name,
  gradeLabel,
  initials,
  signOutAction,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    <div ref={ref} className="relative hidden md:block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 rounded-xl border border-neutral-800/70 hover:border-neutral-700/60 hover:bg-neutral-800/40 transition-all duration-150 group"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary-600/30 to-primary-800/20 border border-primary-500/30 group-hover:border-primary-500/60 flex items-center justify-center shrink-0 transition-all duration-150 shadow-sm shadow-primary-900/30">
          {initials ? (
            <span className="text-[11px] font-bold text-primary-300 tracking-wider">
              {initials}
            </span>
          ) : (
            <svg
              className="w-4 h-4 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          )}
        </div>

        {/* Nombre y grado */}
        <div className="flex flex-col items-start min-w-0">
          <span className="text-xs font-semibold text-neutral-100 leading-none truncate">
            {name}
          </span>
          {gradeLabel && (
            <span className="text-[11px] text-neutral-500 group-hover:text-neutral-400 leading-none mt-0.5 transition-colors">
              {gradeLabel}
            </span>
          )}
        </div>

        {/* Chevron */}
        <svg
          className={`w-3 h-3 text-neutral-600 group-hover:text-neutral-400 transition-all duration-150 shrink-0 ${open ? "rotate-180" : ""}`}
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

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full right-0 mt-1.5 bg-neutral-900/95 backdrop-blur-sm border border-neutral-700/60 rounded-xl shadow-xl shadow-black/40 py-1 min-w-44 z-50">
          {/* Cabecera del menú */}
          <div className="px-3 py-2.5 border-b border-neutral-800/60">
            <p className="text-xs font-semibold text-neutral-100">{name}</p>
            {gradeLabel && (
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {gradeLabel}
              </p>
            )}
          </div>

          {/* Editar perfil */}
          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800/60 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5 text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            Editar perfil
          </Link>

          {/* Cerrar sesión */}
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-neutral-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

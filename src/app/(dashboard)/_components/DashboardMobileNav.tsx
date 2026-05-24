"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface MobileNavItem {
  href: string;
  label: string;
}

export interface MobileNavSection {
  title?: string;
  items: MobileNavItem[];
}

interface DashboardMobileNavProps {
  sections: MobileNavSection[];
  signOutAction: () => Promise<void>;
  isAdmin?: boolean;
  userEmail?: string | null;
  userName?: string | null;
  userInitials?: string | null;
  roleLabel?: string | null;
  profileHref?: string | null;
}

export function DashboardMobileNav({
  sections,
  signOutAction,
  isAdmin = false,
  userEmail,
  userName,
  userInitials,
  roleLabel,
  profileHref,
}: DashboardMobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cierra al navegar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Cierra con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const avatarChar = isAdmin
    ? (userEmail?.[0]?.toUpperCase() ?? "A")
    : (userInitials ?? "?");

  return (
    <>
      {/* ── Botón hamburguesa (solo mobile) ───────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`md:hidden p-2 -mr-1 rounded-lg transition-colors ${
          isAdmin
            ? "text-indigo-400 hover:text-indigo-100 hover:bg-indigo-900/40"
            : "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/70"
        }`}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="dashboard-mobile-menu"
      >
        {open ? (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        )}
      </button>

      {/* ── Overlay ───────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-20 md:hidden bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Panel deslizante ──────────────────────────────────────────────── */}
      {open && (
        <div
          id="dashboard-mobile-menu"
          className={`fixed inset-x-0 top-16 z-30 md:hidden border-b shadow-2xl backdrop-blur-xl ${
            isAdmin
              ? "bg-indigo-950/98 border-indigo-900/60"
              : "bg-neutral-950/98 border-neutral-800/60"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-4 max-h-[calc(100svh-4rem)] overflow-y-auto">
            {/* Secciones de navegación */}
            {sections.map((section, si) => (
              <div key={si}>
                {section.title && (
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-widest px-3 mb-1 ${
                      isAdmin ? "text-indigo-400/60" : "text-neutral-500"
                    }`}
                  >
                    {section.title}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/");
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors ${
                            isActive
                              ? "bg-primary-600/90 text-white font-medium"
                              : isAdmin
                                ? "text-indigo-200/80 hover:text-white hover:bg-indigo-900/50"
                                : "text-neutral-300 hover:text-white hover:bg-neutral-800/70"
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {/* Separador */}
            <div
              className={`h-px ${isAdmin ? "bg-indigo-900/60" : "bg-neutral-800/60"}`}
            />

            {/* Pie: info usuario + perfil + cerrar sesión */}
            <div className="pb-2 space-y-0.5">
              {/* Info de usuario */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isAdmin
                      ? "bg-indigo-600 text-white"
                      : "bg-linear-to-br from-primary-600/30 to-primary-800/20 border border-primary-500/30 text-primary-300"
                  }`}
                >
                  {avatarChar}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-semibold truncate ${
                      isAdmin ? "text-indigo-100" : "text-neutral-100"
                    }`}
                  >
                    {isAdmin ? userEmail : userName}
                  </p>
                  <p
                    className={`text-[10px] mt-0.5 ${
                      isAdmin
                        ? "text-indigo-400 font-semibold"
                        : "text-neutral-500"
                    }`}
                  >
                    {isAdmin ? "Administrador" : roleLabel}
                  </p>
                </div>
              </div>

              {/* Editar perfil (solo no-admin) */}
              {profileHref && !isAdmin && (
                <Link
                  href={profileHref}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60 rounded-lg transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-neutral-500"
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
              )}

              {/* Cerrar sesión */}
              <form action={signOutAction}>
                <button
                  type="submit"
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-colors hover:bg-red-950/30 hover:text-red-400 ${
                    isAdmin ? "text-indigo-400/70" : "text-neutral-400"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
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
          </div>
        </div>
      )}
    </>
  );
}

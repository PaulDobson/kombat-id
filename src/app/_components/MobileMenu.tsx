"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/academies", label: "Academias" },
  { href: "/verify", label: "Verificar" },
  { href: "/referees", label: "Árbitros" },
  { href: "/referee-registration", label: "Registro árbitro" },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* Botón hamburguesa — solo visible debajo de md */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="md:hidden p-2 -mr-1 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/70 transition-colors"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="mobile-menu"
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

      {/* Panel del menú móvil */}
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 top-16 z-40 md:hidden">
          <div className="bg-neutral-950/98 backdrop-blur-xl border-b border-white/6 shadow-2xl">
            <nav
              className="max-w-7xl mx-auto px-4 py-4"
              aria-label="Menú móvil"
            >
              <ul className="space-y-0.5">
                {NAV_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={close}
                      className="flex items-center px-3 py-2.5 text-sm text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800/70 rounded-lg transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-4 pt-4 border-t border-neutral-800 space-y-2">
                <Link
                  href="/login"
                  onClick={close}
                  className="flex items-center px-3 py-2.5 text-sm text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800/70 rounded-lg transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  onClick={close}
                  className="flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 rounded-xl transition-colors ring-1 ring-primary-500/30"
                >
                  Registrarse
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

import Link from "next/link";
import { MobileMenu } from "./MobileMenu";

export function PublicNav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-neutral-950/85 backdrop-blur-xl border-b border-white/6">
      {/* Línea de acento superior */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary-500/50 to-transparent" />

      <nav
        className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4"
        aria-label="Navegación principal"
      >
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 ring-1 ring-white/10 group-hover:ring-primary-500/50 transition-all duration-300 shadow-sm shadow-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/KombatLogoSquare.webp"
              alt="Kombat Taekwondo"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-bold tracking-tight hidden sm:block text-[15px] leading-none">
            <span className="text-neutral-50">Kombat</span>{" "}
            <span className="text-primary-400">Taekwondo</span>
          </span>
        </Link>

        {/* Separador — solo desktop */}
        <div className="hidden md:block w-px h-5 bg-neutral-700/60 shrink-0" />

        {/* Links centrales — solo desktop (md+) */}
        <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
          <Link
            href="/academies"
            className="text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/70 px-3 py-1.5 rounded-lg transition-all duration-150"
          >
            Academias
          </Link>
          <Link
            href="/events"
            className="text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/70 px-3 py-1.5 rounded-lg transition-all duration-150"
          >
            Actividades
          </Link>
          <Link
            href="/verify"
            className="text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/70 px-3 py-1.5 rounded-lg transition-all duration-150"
          >
            Verificar
          </Link>
          <Link
            href="/referees"
            className="text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/70 px-3 py-1.5 rounded-lg transition-all duration-150"
          >
            Árbitros Oficiales
          </Link>
        </div>

        {/* Auth + hamburguesa */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/login"
            className="hidden md:block text-sm text-neutral-400 hover:text-neutral-100 transition-all duration-150 px-3 py-1.5 rounded-lg border border-transparent hover:border-neutral-700/60 hover:bg-neutral-800/50"
          >
            Iniciar sesión
          </Link>
          {/* Dropdown: Registrarse */}
          <div className="relative group hidden md:block">
            <button
              type="button"
              className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 ring-1 ring-primary-500/30 shadow-sm shadow-primary-950/50 hover:shadow-primary-600/20 hover:ring-primary-400/40 flex items-center gap-1.5"
            >
              Registrarse
              <svg
                className="w-3 h-3 transition-transform duration-150 group-hover:rotate-180"
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
            <div className="absolute top-full right-0 mt-1 w-60 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl shadow-black/40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 py-1">
              <Link
                href="/referee-registration"
                className="block px-4 py-2.5 text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/70 transition-colors duration-150"
              >
                Registrarte como árbitro
              </Link>
              <Link
                href="/instructor-registration"
                className="block px-4 py-2.5 text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/70 transition-colors duration-150"
              >
                Registrarte como instructor
              </Link>
            </div>
          </div>
          <MobileMenu />
        </div>
      </nav>
    </header>
  );
}

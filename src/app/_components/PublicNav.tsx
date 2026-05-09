import Link from "next/link";

export function PublicNav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-neutral-950/80 backdrop-blur-md">
      <nav
        className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6"
        aria-label="Navegación principal"
      >
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/KombatLogoSquare.webp"
              alt="Kombat Taekwondo"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-semibold text-neutral-50 tracking-tight hidden sm:block">
            Kombat Taekwondo
          </span>
        </Link>

        {/* Center links */}
        <div className="flex items-center gap-1">
          <Link
            href="/academies"
            className="text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            Academias
          </Link>
          <Link
            href="/verify"
            className="text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 px-3 py-1.5 rounded-lg transition-colors"
          >
            Verificar
          </Link>
          <Link
            href="/referees"
            className="text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 px-3 py-1.5 rounded-lg transition-colors hidden md:block"
          >
            Árbitros
          </Link>
          <Link
            href="/referee-registration"
            className="text-sm text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 px-3 py-1.5 rounded-lg transition-colors hidden md:block"
          >
            Registro
          </Link>
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/login"
            className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors hidden sm:block px-3 py-1.5"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            Registrarse
          </Link>
        </div>
      </nav>
    </header>
  );
}

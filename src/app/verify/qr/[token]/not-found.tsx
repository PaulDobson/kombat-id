import Link from "next/link";

export default function QrNotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Brand */}
      <div className="flex items-center gap-2 mb-12">
        <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
          <span className="text-white font-bold text-xs" aria-hidden="true">
            KT
          </span>
        </div>
        <span className="text-neutral-400 text-sm font-medium">
          Kombat Taekwondo Chile
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* Outer glow ring */}
            <div
              className="absolute inset-0 rounded-full opacity-20 blur-xl"
              style={{
                background:
                  "radial-gradient(circle, #f43f5e 0%, transparent 70%)",
              }}
              aria-hidden="true"
            />
            <div className="relative w-20 h-20 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center">
              {/* QR icon with X */}
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-neutral-500"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h.01" />
                <path d="M18 14h.01" />
                <path d="M14 18h.01" />
                <path d="M18 18h.01" />
              </svg>
              {/* X badge */}
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-error-500 border-2 border-neutral-950 flex items-center justify-center">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-xl font-semibold text-neutral-50 tracking-tight">
            Identidad no encontrada
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            El código QR escaneado no corresponde a ningún practicante
            registrado en el sistema.
          </p>
        </div>

        {/* Possible reasons */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6 space-y-3">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Posibles causas
          </p>
          <ul className="space-y-2">
            {[
              "El QR fue escaneado incorrectamente",
              "El código pertenece a otro sistema",
              "El practicante aún no está registrado",
            ].map((reason) => (
              <li
                key={reason}
                className="flex items-start gap-2.5 text-sm text-neutral-400"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-neutral-600 shrink-0 mt-1.5"
                  aria-hidden="true"
                />
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/verify"
            className="flex items-center justify-center gap-2 w-full bg-neutral-100 hover:bg-white text-neutral-900 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" />
              <path d="M3 12h18" />
              <path d="M12 3a15 15 0 0 1 4 9 15 15 0 0 1-4 9 15 15 0 0 1-4-9 15 15 0 0 1 4-9z" />
            </svg>
            Verificar otro código
          </Link>

          <Link
            href="/"
            className="flex items-center justify-center w-full bg-transparent border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-10 text-xs text-neutral-700 text-center max-w-xs">
        Si crees que esto es un error, contacta al administrador de tu academia.
      </p>
    </div>
  );
}

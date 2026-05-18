"use client";

import { useState, useTransition } from "react";
import { activatePractitionerAction } from "@/modules/practitioner-identity/presentation/actions/adminActions";

interface Props {
  publicId: string;
}

export function ActivateButton({ publicId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

  function handleActivate() {
    setError(null);
    startTransition(async () => {
      const result = await activatePractitionerAction({ publicId });
      if (result.success) {
        setActivated(true);
        // NOTE: router.refresh() is intentionally omitted here.
        // Calling it would re-render the page and destroy this component's
        // state before the admin can download the certificate.
        // The "Actualizar lista" button below lets the admin refresh manually.
      } else {
        setError(result.error);
      }
    });
  }

  if (activated) {
    return (
      <div className="flex flex-col items-end gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Activado
        </span>

        {/* Certificate download — opens in new tab, no page navigation */}
        <a
          href={`/api/membership-certificate/${publicId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-amber-700/30 hover:bg-amber-700/50 border border-amber-600/40 text-amber-300 hover:text-amber-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          Descargar certificado
        </a>

        {/* Manual refresh after downloading */}
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-neutral-500 hover:text-neutral-300 underline underline-offset-2 transition-colors"
        >
          Actualizar lista →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleActivate}
        disabled={isPending}
        className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Activando..." : "✓ Activar membresía"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

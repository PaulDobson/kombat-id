"use client";

import { useTransition, useState } from "react";
import { getRefereeOwnCertificateUrlAction } from "@/modules/referee-registration/presentation/actions/refereeRegistrationActions";

export function DownloadCertificateButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDownload() {
    setError(null);
    startTransition(async () => {
      const result = await getRefereeOwnCertificateUrlAction();
      if (result.success) {
        // Open in new tab — browser will prompt download for PDFs
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        onClick={handleDownload}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600/15 hover:bg-primary-600/25 border border-primary-500/30 hover:border-primary-500/50 text-primary-300 hover:text-primary-200 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Descargar certificado PDF"
      >
        {isPending ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Generando enlace…
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Descargar certificado PDF
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="text-xs text-error-400">
          {error}
        </p>
      )}
    </div>
  );
}

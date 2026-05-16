"use client";

import { useState, useTransition } from "react";
import { getMembershipCertificateUrlAction } from "../actions/certificateActions";

interface Props {
  practitionerId: string;
  hasCertificate: boolean;
}

export function CertificateDownloadButton({
  practitionerId,
  hasCertificate,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDownload() {
    setError(null);
    startTransition(async () => {
      const result = await getMembershipCertificateUrlAction(practitionerId);
      if (result.success) {
        // Open the signed URL in a new tab to trigger download
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      } else {
        setError(result.error);
      }
    });
  }

  if (!hasCertificate) {
    return (
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
        Certificado pendiente de activación por el administrador
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleDownload}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-amber-700/20 hover:bg-amber-700/40 border border-amber-600/40 text-amber-300 hover:text-amber-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-fit"
      >
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
            d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          />
        </svg>
        {isPending
          ? "Generando enlace..."
          : "Descargar certificado de membresía"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

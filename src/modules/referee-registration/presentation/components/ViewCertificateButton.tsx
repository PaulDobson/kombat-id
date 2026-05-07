"use client";

import { useTransition, useState } from "react";
import { getSignedCertificateUrlAction } from "../actions/adminRefereeActions";

interface Props {
  id: string;
}

export function ViewCertificateButton({ id }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleView() {
    setError(null);
    startTransition(async () => {
      const result = await getSignedCertificateUrlAction({ id });
      if (result.success) {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleView}
        disabled={isPending}
        className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Cargando..." : "Ver PDF"}
      </button>
      {error && (
        <p className="text-xs text-error-400 max-w-[160px] text-right">
          {error}
        </p>
      )}
    </div>
  );
}

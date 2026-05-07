"use client";

import { useTransition, useState } from "react";
import { deletePortalPublicationAction } from "../actions/adminRefereeActions";

interface Props {
  id: string;
}

export function DeletePublicationButton({ id }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm("¿Estás seguro de que deseas eliminar esta publicación?")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deletePortalPublicationAction({ id });
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="bg-red-900/40 hover:bg-red-800/60 text-red-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-700/40"
      >
        {isPending ? "Eliminando..." : "Eliminar"}
      </button>
      {error && (
        <p className="text-xs text-error-400 max-w-[160px] text-right">
          {error}
        </p>
      )}
    </div>
  );
}

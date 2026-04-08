"use client";

import { useTransition, useState } from "react";
import { deactivateAcademyAction } from "@/modules/practitioner-identity/presentation/actions/academyActions";

interface Props {
  academyId: string;
}

export function DeactivateAcademyButton({ academyId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState("");

  function handleConfirm() {
    if (!reason.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await deactivateAcademyAction({ academyId, reason });
      if (!result.success) {
        setError(result.error);
        setShowConfirm(false);
      }
    });
  }

  if (showConfirm) {
    return (
      <div className="space-y-3">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo de desactivación (obligatorio)"
          rows={3}
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
        />
        {error && (
          <p role="alert" className="text-xs text-rose-400">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={isPending || !reason.trim()}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Desactivando..." : "Confirmar desactivación"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
    >
      Desactivar academia
    </button>
  );
}

"use client";

import { useTransition, useState } from "react";
import { observeInstructorAccountRequestAction } from "../actions/instructorAccountRequestActions";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  requestId: string;
}

// ---------------------------------------------------------------------------
// Component
// Validates: Requirements 6.1, 6.2, 6.3
// ---------------------------------------------------------------------------

export function ObserveInstructorRequestButton({ requestId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasContent = notes.trim().length > 0;

  function handleOpen() {
    setIsOpen(true);
    setError(null);
  }

  function handleCancel() {
    setIsOpen(false);
    setNotes("");
    setError(null);
  }

  function handleConfirm() {
    if (!hasContent) return;
    setError(null);
    startTransition(async () => {
      const result = await observeInstructorAccountRequestAction({
        requestId,
        observationNotes: notes.trim(),
      });
      if (!result.success) {
        setError(result.error);
      } else {
        setIsOpen(false);
        setNotes("");
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="bg-blue-900/60 hover:bg-blue-800 text-blue-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
      >
        Observar
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Escribe una nota de observación…"
        rows={3}
        className="w-full text-xs bg-neutral-800 border border-neutral-600 rounded-lg px-2 py-1.5 text-neutral-200 placeholder-neutral-500 resize-none focus:outline-none focus:border-blue-500"
        disabled={isPending}
      />
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="text-neutral-400 hover:text-neutral-200 px-2 py-1 rounded text-xs transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={!hasContent || isPending}
          className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Guardando..." : "Confirmar"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400 text-right">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { observeCertificationRequestAction } from "@/modules/practitioner-identity/presentation/actions/instructorActions";

interface Props {
  requestId: string;
}

export function ObserveRequestButton({ requestId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [observationNotes, setObservationNotes] = useState("");

  function handleSubmit() {
    startTransition(async () => {
      const result = await observeCertificationRequestAction({
        requestId,
        observationNotes,
      });
      if (!result.success) {
        alert(`Error al observar: ${result.error}`);
      }
    });
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        disabled={isPending}
        className="bg-blue-900/50 hover:bg-blue-800/50 text-blue-400 border border-blue-800 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Observar
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <textarea
        value={observationNotes}
        onChange={(e) => setObservationNotes(e.target.value)}
        placeholder="Escribe las observaciones..."
        disabled={isPending}
        rows={2}
        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 resize-none focus:outline-none focus:border-blue-700 disabled:opacity-50"
      />
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleSubmit}
          disabled={isPending || !observationNotes.trim()}
          className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Enviando..." : "Confirmar"}
        </button>
        <button
          onClick={() => {
            setShowForm(false);
            setObservationNotes("");
          }}
          disabled={isPending}
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700 px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

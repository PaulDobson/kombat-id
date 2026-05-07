"use client";

import { useState, useTransition } from "react";
import {
  registerForEventAction,
  unregisterFromEventAction,
} from "../actions/refereeEventActions";

interface Props {
  publicationId: string;
  isRegistered: boolean;
  isDeadlinePassed: boolean;
  isFull: boolean;
}

export function EventRegistrationButton({
  publicationId,
  isRegistered: initialIsRegistered,
  isDeadlinePassed,
  isFull,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [isRegistered, setIsRegistered] = useState(initialIsRegistered);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = isRegistered
        ? await unregisterFromEventAction({ publicationId })
        : await registerForEventAction({ publicationId });

      if (result.success) {
        setIsRegistered(!isRegistered);
      } else {
        setError(result.error);
      }
    });
  }

  if (isDeadlinePassed && !isRegistered) {
    return (
      <div className="text-xs text-neutral-500 bg-neutral-800/60 border border-neutral-700/40 rounded-lg px-3 py-2 text-center">
        Plazo de inscripción cerrado
      </div>
    );
  }

  if (isFull && !isRegistered) {
    return (
      <div className="text-xs text-neutral-500 bg-neutral-800/60 border border-neutral-700/40 rounded-lg px-3 py-2 text-center">
        Sin cupos disponibles
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={
          isRegistered
            ? "w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 bg-emerald-900/40 hover:bg-red-900/40 text-emerald-300 hover:text-red-300 border border-emerald-700/40 hover:border-red-700/40"
            : "w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500"
        }
      >
        {isPending
          ? isRegistered
            ? "Cancelando..."
            : "Inscribiendo..."
          : isRegistered
            ? "✓ Inscrito — Click para cancelar"
            : "Inscribirse al evento"}
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
}

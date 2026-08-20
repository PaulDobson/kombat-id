"use client";

import { useState, useTransition } from "react";
import { Calendar, Navigation } from "lucide-react";
import { markStepCompleteAction } from "../../actions/onboardingActions";

interface EventsInfoStepProps {
  onComplete: () => void;
}

export function EventsInfoStep({ onComplete }: EventsInfoStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleComplete() {
    setError(null);
    startTransition(async () => {
      const result = await markStepCompleteAction({
        step: "step_events_info_completed",
      });
      if (result.success) {
        onComplete();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-neutral-200 mb-1">
              Sección de Eventos
            </p>
            <p className="text-sm text-neutral-400">
              Consulta torneos, seminarios y competencias programadas en el
              calendario oficial.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Navigation className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-neutral-200 mb-1">
              Cómo acceder
            </p>
            <p className="text-sm text-neutral-400">
              Accede desde el menú lateral →{" "}
              <span className="text-neutral-200 font-medium">Eventos</span>
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={isPending}
        onClick={handleComplete}
        className="w-full bg-primary-500 hover:bg-primary-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-neutral-900 font-semibold rounded-xl py-2.5 text-sm transition-colors"
      >
        {isPending ? "Finalizando..." : "Finalizar configuración ✓"}
      </button>
    </div>
  );
}

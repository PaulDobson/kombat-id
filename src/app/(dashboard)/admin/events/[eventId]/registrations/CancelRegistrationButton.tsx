"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { cancelRegistrationAction } from "@/modules/event-registration/presentation/actions/registrationActions";

interface Props {
  registrationId: string;
  eventId: string;
}

export function CancelRegistrationButton({ registrationId, eventId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm("¿Estás seguro de que deseas cancelar esta inscripción?"))
      return;
    setError(null);
    startTransition(async () => {
      const result = await cancelRegistrationAction({
        registrationId,
        eventId,
      });
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="bg-neutral-800 hover:bg-error-900/30 text-neutral-400 hover:text-error-400 border border-neutral-700 hover:border-error-800 px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Cancelando..." : "Cancelar inscripción"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-error-400 max-w-[160px]">
          {error}
        </p>
      )}
    </div>
  );
}

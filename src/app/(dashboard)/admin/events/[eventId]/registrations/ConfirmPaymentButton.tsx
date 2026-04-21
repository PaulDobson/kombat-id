"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmPaymentAction } from "@/modules/event-registration/presentation/actions/registrationActions";

interface Props {
  registrationId: string;
  eventId: string;
}

export function ConfirmPaymentButton({ registrationId, eventId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await confirmPaymentAction({ registrationId, eventId });
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
        className="bg-success-900/50 hover:bg-success-900 text-success-400 border border-success-800 px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Confirmando..." : "Confirmar pago"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-error-400 max-w-[160px]">
          {error}
        </p>
      )}
    </div>
  );
}

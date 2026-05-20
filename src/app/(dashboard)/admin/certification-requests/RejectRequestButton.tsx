"use client";

import { useTransition } from "react";
import { rejectCertificationRequestAction } from "@/modules/practitioner-identity/presentation/actions/adminCertificationActions";

interface Props {
  requestId: string;
}

export function RejectRequestButton({ requestId }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleReject() {
    startTransition(async () => {
      const result = await rejectCertificationRequestAction({ requestId });
      if (!result.success) {
        alert(`Error al rechazar: ${result.error}`);
      }
    });
  }

  return (
    <button
      onClick={handleReject}
      disabled={isPending}
      className="bg-rose-900/50 hover:bg-rose-800/50 text-rose-400 border border-rose-800 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? "Rechazando..." : "Rechazar"}
    </button>
  );
}

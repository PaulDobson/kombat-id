"use client";

import { useTransition } from "react";
import { approveCertificationRequestAction } from "@/modules/practitioner-identity/presentation/actions/adminCertificationActions";

interface Props {
  requestId: string;
}

export function ApproveRequestButton({ requestId }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      const result = await approveCertificationRequestAction({ requestId });
      if (!result.success) {
        alert(`Error al aprobar: ${result.error}`);
      }
    });
  }

  return (
    <button
      onClick={handleApprove}
      disabled={isPending}
      className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? "Aprobando..." : "Aprobar"}
    </button>
  );
}

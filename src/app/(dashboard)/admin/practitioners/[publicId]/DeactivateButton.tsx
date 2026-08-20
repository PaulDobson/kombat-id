"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deactivatePractitionerAction } from "@/modules/practitioner-identity/presentation/actions/adminActions";

interface Props {
  publicId: string;
  adminId: string;
}

export function DeactivateButton({ publicId, adminId }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDeactivate() {
    const reason = prompt("Motivo de desactivación:");
    if (!reason) return;

    startTransition(async () => {
      const result = await deactivatePractitionerAction({
        publicId,
        adminId,
        reason,
      });
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <button
      onClick={handleDeactivate}
      disabled={isPending}
      className="bg-red-900/70 hover:bg-red-900/50 text-red-400 border border-red-800 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? "Desactivando..." : "Desactivar practicante"}
    </button>
  );
}

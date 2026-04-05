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
    <button onClick={handleDeactivate} disabled={isPending}>
      {isPending ? "Desactivando..." : "Desactivar practicante"}
    </button>
  );
}

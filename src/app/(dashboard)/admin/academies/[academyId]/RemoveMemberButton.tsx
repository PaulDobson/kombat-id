"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removePractitionerFromAcademyAction } from "@/modules/practitioner-identity/presentation/actions/academyActions";

export function RemoveMemberButton({
  practitionerId,
}: {
  practitionerId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRemove() {
    startTransition(async () => {
      await removePractitionerFromAcademyAction({ practitionerId });
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleRemove}
      disabled={isPending}
      className="text-xs text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
      aria-label="Quitar de la academia"
    >
      {isPending ? "..." : "Quitar"}
    </button>
  );
}

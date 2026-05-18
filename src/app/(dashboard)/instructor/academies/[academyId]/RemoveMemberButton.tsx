"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { instructorRemovePractitionerAction } from "@/modules/practitioner-identity/presentation/actions/instructorAcademyActions";

export function RemoveMemberButton({
  academyId,
  practitionerId,
}: {
  academyId: string;
  practitionerId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRemove() {
    startTransition(async () => {
      await instructorRemovePractitionerAction({ academyId, practitionerId });
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleRemove}
      disabled={isPending}
      className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
      aria-label="Quitar de la academia"
    >
      {isPending ? "..." : "Quitar"}
    </button>
  );
}

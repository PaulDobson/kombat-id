"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
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

  async function handleClick() {
    const result = await Swal.fire({
      title: "¿Quitar alumno?",
      text: "El alumno será removido de esta academia. Esta acción se puede revertir asignándolo nuevamente.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, quitar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#404040",
      background: "#171717",
      color: "#f5f5f5",
    });

    if (!result.isConfirmed) return;

    startTransition(async () => {
      await instructorRemovePractitionerAction({ academyId, practitionerId });
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="p-1.5 rounded-md text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
      aria-label="Quitar de la academia"
      title="Quitar de la academia"
    >
      {isPending ? (
        <svg
          className="w-3.5 h-3.5 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      ) : (
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
          />
        </svg>
      )}
    </button>
  );
}

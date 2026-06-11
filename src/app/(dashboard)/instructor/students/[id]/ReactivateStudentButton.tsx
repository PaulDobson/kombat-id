"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { reactivateStudentAction } from "@/modules/practitioner-identity/presentation/actions/instructorAcademyActions";
import Swal from "sweetalert2";

interface Props {
  publicId: string;
  studentName: string;
}

export function ReactivateStudentButton({ publicId, studentName }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleReactivate() {
    const confirm = await Swal.fire({
      title: "¿Reactivar alumno?",
      html: `<p class="text-sm text-neutral-300">Se reactivará la cuenta de <strong>${studentName}</strong> y podrá acceder nuevamente al sistema.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, reactivar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#404040",
      background: "#171717",
      color: "#f5f5f5",
    });

    if (!confirm.isConfirmed) return;

    startTransition(async () => {
      const result = await reactivateStudentAction({ publicId });

      if (result.success) {
        await Swal.fire({
          title: "¡Alumno reactivado!",
          text: `${studentName} ha sido reactivado correctamente.`,
          icon: "success",
          confirmButtonColor: "#10b981",
          background: "#171717",
          color: "#f5f5f5",
        });
        router.refresh();
      } else {
        await Swal.fire({
          title: "Error",
          text: result.error ?? "No se pudo reactivar el alumno.",
          icon: "error",
          confirmButtonColor: "#ef4444",
          background: "#171717",
          color: "#f5f5f5",
        });
      }
    });
  }

  return (
    <button
      onClick={handleReactivate}
      disabled={isPending}
      title={`Reactivar a ${studentName}`}
      className="inline-flex items-center gap-1.5 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? "Reactivando..." : "Reactivar alumno"}
    </button>
  );
}

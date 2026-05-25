"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { instructorDeletePractitionerAction } from "@/modules/practitioner-identity/presentation/actions/instructorAcademyActions";

interface Props {
  publicId: string;
  studentName: string;
}

export function DeleteStudentButton({ publicId, studentName }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleDelete() {
    const result = await Swal.fire({
      title: "¿Eliminar alumno?",
      html: `
        <p class="text-sm text-neutral-300 mb-3">
          Estás a punto de <strong class="text-red-400">desactivar permanentemente</strong> a <strong>${studentName}</strong>.
        </p>
        <div class="text-xs text-neutral-400 text-left bg-neutral-800 p-3 rounded-lg mb-3">
          <p class="font-semibold text-amber-400 mb-2">⚠️ Esta acción desactivará el alumno y:</p>
          <ul class="list-disc list-inside space-y-1 ml-2">
            <li>Marcará todas las membresías como inactivas</li>
            <li>Revocará todas las certificaciones</li>
            <li>Desactivará grados de disciplinas</li>
            <li>Marcará el registro como eliminado (soft delete)</li>
            <li><strong class="text-red-400">Eliminará físicamente la cuenta de autenticación</strong></li>
          </ul>
          <p class="mt-2 text-blue-400 text-xs">
            <strong>Nota 1:</strong> Los datos históricos (exámenes, eventos, pagos, historial marcial) se conservarán para auditoría.
          </p>
          <p class="mt-1 text-amber-400 text-xs">
            <strong>Nota 2:</strong> Solo puedes desactivar alumnos que tú registraste.
          </p>
        </div>
        <p class="text-xs text-neutral-500">
          Escribe <strong class="text-neutral-300">ELIMINAR</strong> para confirmar
        </p>
      `,
      input: "text",
      inputPlaceholder: "Escribe ELIMINAR",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar permanentemente",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#404040",
      background: "#171717",
      color: "#f5f5f5",
      inputValidator: (value) => {
        if (value !== "ELIMINAR") {
          return "Debes escribir ELIMINAR para confirmar";
        }
        return null;
      },
    });

    if (!result.isConfirmed) return;

    startTransition(async () => {
      const deleteResult = await instructorDeletePractitionerAction({
        publicId,
      });
      if (deleteResult.success) {
        await Swal.fire({
          title: "¡Eliminado!",
          text: "El alumno ha sido desactivado del sistema. Su cuenta de autenticación ha sido eliminada.",
          icon: "success",
          confirmButtonColor: "#10b981",
          background: "#171717",
          color: "#f5f5f5",
        });
        router.push("/instructor");
        router.refresh();
      } else {
        await Swal.fire({
          title: "Error",
          text: deleteResult.error,
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
      onClick={handleDelete}
      disabled={isPending}
      className="bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? "Eliminando..." : "Eliminar alumno"}
    </button>
  );
}

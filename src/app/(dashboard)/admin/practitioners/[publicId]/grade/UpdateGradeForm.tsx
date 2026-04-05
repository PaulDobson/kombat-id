"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePractitionerGradeAction } from "@/modules/practitioner-identity/presentation/actions/adminActions";
import type { Grade } from "@/modules/practitioner-identity/domain/entities/practitioner";

const GRADE_RANK: Record<Grade, number> = {
  white: 0,
  yellow: 1,
  green: 2,
  blue: 3,
  red: 4,
  black: 5,
};

interface Props {
  publicId: string;
  adminId: string;
  currentGrade: Grade;
}

export function UpdateGradeForm({ publicId, adminId, currentGrade }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newGrade = formData.get("newGrade") as Grade;
    const justification = formData.get("justification") as string;

    const isDowngrade = GRADE_RANK[newGrade] < GRADE_RANK[currentGrade];
    if (isDowngrade && !justification.trim()) {
      alert("Se requiere justificación para degradar el grado.");
      return;
    }

    startTransition(async () => {
      const result = await updatePractitionerGradeAction({
        publicId,
        adminId,
        newGrade,
        justification: justification || undefined,
      });
      if (result.success) {
        router.push(`/admin/practitioners/${publicId}`);
      } else {
        alert(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="newGrade">Nuevo grado</label>
        <select id="newGrade" name="newGrade" required>
          <option value="">Seleccionar...</option>
          <option value="white">Blanco</option>
          <option value="yellow">Amarillo</option>
          <option value="green">Verde</option>
          <option value="blue">Azul</option>
          <option value="red">Rojo</option>
          <option value="black">Negro</option>
        </select>
      </div>

      <div>
        <label htmlFor="justification">
          Justificación (requerida para degradación)
        </label>
        <textarea id="justification" name="justification" rows={3} />
      </div>

      <button type="submit" disabled={isPending}>
        {isPending ? "Actualizando..." : "Actualizar grado"}
      </button>
    </form>
  );
}

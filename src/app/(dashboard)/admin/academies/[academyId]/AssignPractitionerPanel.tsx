"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignPractitionerToAcademyAction } from "@/modules/practitioner-identity/presentation/actions/academyActions";

interface PractitionerOption {
  id: string;
  fullName: string;
  rut: string;
  grade: string;
}

export function AssignPractitionerPanel({
  academyId,
  available,
}: {
  academyId: string;
  available: PractitionerOption[];
}) {
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const GRADE_LABELS: Record<string, string> = {
    white: "Blanco",
    yellow: "Amarillo",
    green: "Verde",
    blue: "Azul",
    red: "Rojo",
    black: "Negro",
  };

  function handleAssign() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await assignPractitionerToAcademyAction({
        practitionerId: selected,
        academyId,
      });
      if (result.success) {
        setSelected("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (available.length === 0) {
    return (
      <p className="text-neutral-500 text-sm">
        Todos los practicantes sin academia ya están asignados, o no hay
        practicantes registrados.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Seleccionar practicante...</option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName} — {p.rut} ({GRADE_LABELS[p.grade] ?? p.grade})
            </option>
          ))}
        </select>
        <button
          onClick={handleAssign}
          disabled={!selected || isPending}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isPending ? "Asignando..." : "Asignar"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}

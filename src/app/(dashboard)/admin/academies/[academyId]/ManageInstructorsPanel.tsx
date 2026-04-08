"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addInstructorToAcademyAction,
  removeInstructorFromAcademyAction,
} from "@/modules/practitioner-identity/presentation/actions/academyActions";

interface InstructorOption {
  id: string;
  fullName: string;
  rut: string;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  instructor: "Instructor",
  profesor: "Profesor",
  maestro: "Maestro",
};

export function ManageInstructorsPanel({
  academyId,
  current,
  available,
}: {
  academyId: string;
  current: InstructorOption[];
  available: InstructorOption[];
}) {
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await addInstructorToAcademyAction({
        academyId,
        instructorId: selected,
      });
      if (result.success) {
        setSelected("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function handleRemove(instructorId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeInstructorFromAcademyAction({
        academyId,
        instructorId,
      });
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Current instructors */}
      {current.length > 0 && (
        <ul className="divide-y divide-neutral-800">
          {current.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <div>
                <span className="text-neutral-100 font-medium">
                  {i.fullName}
                </span>
                <span className="ml-2 text-xs text-neutral-500">
                  {ROLE_LABELS[i.role] ?? i.role} · {i.rut}
                </span>
              </div>
              <button
                onClick={() => handleRemove(i.id)}
                disabled={isPending}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add instructor */}
      {available.length > 0 && (
        <div className="flex gap-3">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Seleccionar instructor / maestro...</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} — {ROLE_LABELS[p.role] ?? p.role} ({p.rut})
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!selected || isPending}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isPending ? "Guardando..." : "Vincular"}
          </button>
        </div>
      )}

      {available.length === 0 && current.length === 0 && (
        <p className="text-neutral-500 text-sm">
          No hay instructores, profesores ni maestros registrados.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}

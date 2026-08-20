"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createAcademyAction } from "@/modules/practitioner-identity/presentation/actions/academyActions";
import { ROLE_LABELS } from "@/lib/roles";

const REGIONS = [
  { value: "arica_y_parinacota", label: "Arica y Parinacota" },
  { value: "tarapaca", label: "Tarapacá" },
  { value: "antofagasta", label: "Antofagasta" },
  { value: "atacama", label: "Atacama" },
  { value: "coquimbo", label: "Coquimbo" },
  { value: "valparaiso", label: "Valparaíso" },
  { value: "metropolitana", label: "Metropolitana" },
  { value: "ohiggins", label: "O'Higgins" },
  { value: "maule", label: "Maule" },
  { value: "nuble", label: "Ñuble" },
  { value: "biobio", label: "Biobío" },
  { value: "araucania", label: "Araucanía" },
  { value: "los_rios", label: "Los Ríos" },
  { value: "los_lagos", label: "Los Lagos" },
  { value: "aysen", label: "Aysén" },
  { value: "magallanes", label: "Magallanes" },
];

interface InstructorOption {
  id: string;
  fullName: string;
  rut: string;
  role: string;
}

interface Props {
  availableInstructors: InstructorOption[];
}

export function RegisterAcademyForm({ availableInstructors }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Instructor selector state
  const [selectedInstructors, setSelectedInstructors] = useState<
    InstructorOption[]
  >([]);
  const [selectedId, setSelectedId] = useState("");

  const remaining = availableInstructors.filter(
    (i) => !selectedInstructors.some((s) => s.id === i.id),
  );

  function handleAddInstructor() {
    const instructor = availableInstructors.find((i) => i.id === selectedId);
    if (!instructor) return;
    setSelectedInstructors((prev) => [...prev, instructor]);
    setSelectedId("");
  }

  function handleRemoveInstructor(id: string) {
    setSelectedInstructors((prev) => prev.filter((i) => i.id !== id));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      const result = await createAcademyAction({
        name: data.get("name") as string,
        region: data.get("region") as string,
        city: data.get("city") as string,
        address: (data.get("address") as string) || undefined,
        foundedDate: (data.get("foundedDate") as string) || undefined,
        responsibleInstructorIds: selectedInstructors.map((i) => i.id),
      });

      if (result.success) {
        router.push(`/admin/academies/${result.data.academyId}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Nombre oficial
        </label>
        <input
          name="name"
          required
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Academia Kombat Taekwondo..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Región
        </label>
        <select
          name="region"
          required
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">Seleccionar región</option>
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Ciudad
        </label>
        <input
          name="city"
          required
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Santiago"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Dirección (opcional)
        </label>
        <input
          name="address"
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Av. Ejemplo 123"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Fecha de fundación (opcional)
        </label>
        <input
          name="foundedDate"
          type="date"
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Instructor selector */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Instructores responsables{" "}
          <span className="text-neutral-500 font-normal">(opcional)</span>
        </label>

        {/* Selected instructors list */}
        {selectedInstructors.length > 0 && (
          <ul className="divide-y divide-neutral-800 mb-3 border border-neutral-700 rounded-lg overflow-hidden">
            {selectedInstructors.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between px-3 py-2.5 text-sm bg-neutral-800/50"
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
                  type="button"
                  onClick={() => handleRemoveInstructor(i.id)}
                  className="text-xs text-rose-400 hover:text-rose-300 transition-colors ml-4"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add instructor dropdown */}
        {remaining.length > 0 && (
          <div className="flex gap-2">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Seleccionar instructor / maestro...</option>
              {remaining.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} — {ROLE_LABELS[p.role] ?? p.role} ({p.rut})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddInstructor}
              disabled={!selectedId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              Agregar
            </button>
          </div>
        )}

        {availableInstructors.length === 0 && (
          <p className="text-xs text-neutral-500">
            No hay instructores, profesores ni maestros activos registrados.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-rose-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Registrando..." : "Registrar academia"}
      </button>
    </form>
  );
}

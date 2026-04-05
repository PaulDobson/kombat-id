"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createAcademyAction } from "@/modules/practitioner-identity/presentation/actions/academyActions";

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

export function RegisterAcademyForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [instructorIds, setInstructorIds] = useState<string>("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    const responsibleInstructorIds = instructorIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await createAcademyAction({
        name: data.get("name") as string,
        region: data.get("region") as string,
        city: data.get("city") as string,
        address: (data.get("address") as string) || undefined,
        foundedDate: (data.get("foundedDate") as string) || undefined,
        responsibleInstructorIds,
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

      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          IDs de instructores responsables (separados por coma)
        </label>
        <input
          value={instructorIds}
          onChange={(e) => setInstructorIds(e.target.value)}
          required
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="uuid1, uuid2"
        />
        <p className="text-xs text-neutral-500 mt-1">
          Los instructores deben tener rol instructor, profesor o maestro.
        </p>
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

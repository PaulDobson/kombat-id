"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createInstructorAcademyAction } from "@/modules/practitioner-identity/presentation/actions/instructorAcademyActions";

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

const inputClass =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50";

export function CreateAcademyForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      const result = await createInstructorAcademyAction({
        name: data.get("name") as string,
        region: data.get("region") as string,
        city: data.get("city") as string,
        address: (data.get("address") as string) || undefined,
        foundedDate: (data.get("foundedDate") as string) || undefined,
      });

      if (result.success) {
        router.push("/instructor");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-primary-900/20 border border-primary-800/40 rounded-xl px-4 py-3">
        <span className="text-primary-400 text-lg shrink-0" aria-hidden="true">
          ℹ️
        </span>
        <p className="text-xs text-primary-300 leading-relaxed">
          Serás asignado automáticamente como instructor responsable de esta
          academia.
        </p>
      </div>

      {/* Nombre */}
      <div className="space-y-1">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-neutral-300"
        >
          Nombre oficial
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          disabled={isPending}
          className={inputClass}
          placeholder="Academia Kombat Taekwondo..."
        />
      </div>

      {/* Región */}
      <div className="space-y-1">
        <label
          htmlFor="region"
          className="block text-sm font-medium text-neutral-300"
        >
          Región
        </label>
        <select
          id="region"
          name="region"
          required
          disabled={isPending}
          className={inputClass}
        >
          <option value="">Seleccionar región</option>
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Ciudad */}
      <div className="space-y-1">
        <label
          htmlFor="city"
          className="block text-sm font-medium text-neutral-300"
        >
          Ciudad / Comuna
        </label>
        <input
          id="city"
          name="city"
          type="text"
          required
          disabled={isPending}
          className={inputClass}
          placeholder="Santiago"
        />
      </div>

      {/* Dirección */}
      <div className="space-y-1">
        <label
          htmlFor="address"
          className="block text-sm font-medium text-neutral-300"
        >
          Dirección{" "}
          <span className="text-neutral-500 font-normal">(opcional)</span>
        </label>
        <input
          id="address"
          name="address"
          type="text"
          disabled={isPending}
          className={inputClass}
          placeholder="Av. Ejemplo 123"
        />
      </div>

      {/* Fecha de fundación */}
      <div className="space-y-1">
        <label
          htmlFor="foundedDate"
          className="block text-sm font-medium text-neutral-300"
        >
          Fecha de fundación{" "}
          <span className="text-neutral-500 font-normal">(opcional)</span>
        </label>
        <input
          id="foundedDate"
          name="foundedDate"
          type="date"
          disabled={isPending}
          className={inputClass}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Creando..." : "Crear academia"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => router.back()}
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const CHILE_REGIONS = [
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
] as const;

export const AcademyBasicDataSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(120, "Máximo 120 caracteres"),
  region: z.enum(
    [
      "arica_y_parinacota",
      "tarapaca",
      "antofagasta",
      "atacama",
      "coquimbo",
      "valparaiso",
      "metropolitana",
      "ohiggins",
      "maule",
      "nuble",
      "biobio",
      "araucania",
      "los_rios",
      "los_lagos",
      "aysen",
      "magallanes",
    ],
    { error: "Selecciona una región" },
  ),
  city: z.string().min(1, "Ciudad requerida").max(80, "Máximo 80 caracteres"),
  address: z.string().max(200, "Máximo 200 caracteres").optional(),
  foundedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato inválido (YYYY-MM-DD)")
    .optional()
    .or(z.literal("")),
});

export type AcademyBasicData = z.infer<typeof AcademyBasicDataSchema>;

interface AcademyBasicDataFormProps {
  onSubmit: (data: AcademyBasicData) => void;
  isSubmitting: boolean;
}

export function AcademyBasicDataForm({
  onSubmit,
  isSubmitting,
}: AcademyBasicDataFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcademyBasicData>({
    resolver: zodResolver(AcademyBasicDataSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Nombre de la academia <span className="text-red-400">*</span>
        </label>
        <input
          {...register("name")}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Ej: Academia Kombat Santiago"
        />
        {errors.name && (
          <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Region */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Región <span className="text-red-400">*</span>
        </label>
        <select
          {...register("region")}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Selecciona una región</option>
          {CHILE_REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {errors.region && (
          <p className="text-xs text-red-400 mt-1">{errors.region.message}</p>
        )}
      </div>

      {/* City */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Ciudad <span className="text-red-400">*</span>
        </label>
        <input
          {...register("city")}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Ej: Santiago"
        />
        {errors.city && (
          <p className="text-xs text-red-400 mt-1">{errors.city.message}</p>
        )}
      </div>

      {/* Address (optional) */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Dirección <span className="text-neutral-500 text-xs">(opcional)</span>
        </label>
        <input
          {...register("address")}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Ej: Av. Providencia 1234"
        />
        {errors.address && (
          <p className="text-xs text-red-400 mt-1">{errors.address.message}</p>
        )}
      </div>

      {/* Founded Date (optional) */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">
          Fecha de fundación{" "}
          <span className="text-neutral-500 text-xs">(opcional)</span>
        </label>
        <input
          type="date"
          {...register("foundedDate")}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {errors.foundedDate && (
          <p className="text-xs text-red-400 mt-1">
            {errors.foundedDate.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary-500 hover:bg-primary-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-neutral-900 font-semibold rounded-xl py-2.5 text-sm transition-colors"
      >
        {isSubmitting ? "Guardando..." : "Siguiente →"}
      </button>
    </form>
  );
}

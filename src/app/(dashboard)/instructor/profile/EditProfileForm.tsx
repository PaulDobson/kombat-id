"use client";

import { useState, useTransition } from "react";
import { updateInstructorProfileAction } from "@/modules/practitioner-identity/presentation/actions/instructorAcademyActions";
import type { Practitioner } from "@/modules/practitioner-identity/domain/entities/practitioner";

const inputClass =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50";

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

interface Props {
  practitioner: Pick<
    Practitioner,
    | "fullName"
    | "birthDate"
    | "gender"
    | "contactPhone"
    | "contactEmail"
    | "addressStreet"
    | "addressCity"
    | "addressRegion"
  >;
}

export function EditProfileForm({ practitioner }: Props) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const data = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateInstructorProfileAction({
        fullName: data.get("fullName") as string,
        birthDate: (data.get("birthDate") as string) || undefined,
        gender:
          (data.get("gender") as "male" | "female" | "other") || undefined,
        contactPhone: (data.get("contactPhone") as string) || null,
        contactEmail: (data.get("contactEmail") as string) || null,
        addressStreet: (data.get("addressStreet") as string) || null,
        addressCity: (data.get("addressCity") as string) || null,
        addressRegion: (data.get("addressRegion") as string) || null,
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Nombre completo */}
        <div className="sm:col-span-2 space-y-1">
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-neutral-300"
          >
            Nombre completo
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            defaultValue={practitioner.fullName}
            disabled={isPending}
            className={inputClass}
          />
        </div>

        {/* Fecha de nacimiento */}
        <div className="space-y-1">
          <label
            htmlFor="birthDate"
            className="block text-sm font-medium text-neutral-300"
          >
            Fecha de nacimiento
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            defaultValue={practitioner.birthDate ?? ""}
            disabled={isPending}
            className={inputClass}
          />
        </div>

        {/* Género */}
        <div className="space-y-1">
          <label
            htmlFor="gender"
            className="block text-sm font-medium text-neutral-300"
          >
            Género
          </label>
          <select
            id="gender"
            name="gender"
            defaultValue={practitioner.gender ?? ""}
            disabled={isPending}
            className={inputClass}
          >
            <option value="">Seleccionar</option>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
            <option value="other">Otro</option>
          </select>
        </div>

        {/* Email de contacto */}
        <div className="space-y-1">
          <label
            htmlFor="contactEmail"
            className="block text-sm font-medium text-neutral-300"
          >
            Email de contacto{" "}
            <span className="text-neutral-500 font-normal">(opcional)</span>
          </label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={practitioner.contactEmail ?? ""}
            disabled={isPending}
            className={inputClass}
            placeholder="contacto@email.com"
          />
        </div>

        {/* Teléfono */}
        <div className="space-y-1">
          <label
            htmlFor="contactPhone"
            className="block text-sm font-medium text-neutral-300"
          >
            Teléfono{" "}
            <span className="text-neutral-500 font-normal">(opcional)</span>
          </label>
          <input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            defaultValue={practitioner.contactPhone ?? ""}
            disabled={isPending}
            className={inputClass}
            placeholder="+56 9 1234 5678"
          />
        </div>

        {/* Dirección */}
        <div className="sm:col-span-2 space-y-1">
          <label
            htmlFor="addressStreet"
            className="block text-sm font-medium text-neutral-300"
          >
            Dirección{" "}
            <span className="text-neutral-500 font-normal">(opcional)</span>
          </label>
          <input
            id="addressStreet"
            name="addressStreet"
            type="text"
            defaultValue={practitioner.addressStreet ?? ""}
            disabled={isPending}
            className={inputClass}
            placeholder="Av. Ejemplo 123"
          />
        </div>

        {/* Ciudad */}
        <div className="space-y-1">
          <label
            htmlFor="addressCity"
            className="block text-sm font-medium text-neutral-300"
          >
            Ciudad{" "}
            <span className="text-neutral-500 font-normal">(opcional)</span>
          </label>
          <input
            id="addressCity"
            name="addressCity"
            type="text"
            defaultValue={practitioner.addressCity ?? ""}
            disabled={isPending}
            className={inputClass}
            placeholder="Santiago"
          />
        </div>

        {/* Región */}
        <div className="space-y-1">
          <label
            htmlFor="addressRegion"
            className="block text-sm font-medium text-neutral-300"
          >
            Región{" "}
            <span className="text-neutral-500 font-normal">(opcional)</span>
          </label>
          <select
            id="addressRegion"
            name="addressRegion"
            defaultValue={practitioner.addressRegion ?? ""}
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
      </div>

      {error && (
        <p
          role="alert"
          className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          ✓ Perfil actualizado correctamente
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}

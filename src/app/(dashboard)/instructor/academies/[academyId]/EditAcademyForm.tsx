"use client";

import { useState, useTransition } from "react";
import { updateInstructorAcademyAction } from "@/modules/practitioner-identity/presentation/actions/instructorAcademyActions";

const inputClass =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50";

interface Props {
  academyId: string;
  name: string;
  city: string;
  address: string | null;
  foundedDate: string | null;
}

export function EditAcademyForm({
  academyId,
  name,
  city,
  address,
  foundedDate,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const data = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateInstructorAcademyAction({
        academyId,
        name: data.get("name") as string,
        city: data.get("city") as string,
        address: (data.get("address") as string) || null,
        foundedDate: (data.get("foundedDate") as string) || null,
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nombre */}
        <div className="sm:col-span-2 space-y-1">
          <label
            htmlFor="acad-name"
            className="block text-sm font-medium text-neutral-300"
          >
            Nombre oficial
          </label>
          <input
            id="acad-name"
            name="name"
            type="text"
            required
            defaultValue={name}
            disabled={isPending}
            className={inputClass}
          />
        </div>

        {/* Ciudad */}
        <div className="space-y-1">
          <label
            htmlFor="acad-city"
            className="block text-sm font-medium text-neutral-300"
          >
            Ciudad / Comuna
          </label>
          <input
            id="acad-city"
            name="city"
            type="text"
            required
            defaultValue={city}
            disabled={isPending}
            className={inputClass}
          />
        </div>

        {/* Fecha de fundación */}
        <div className="space-y-1">
          <label
            htmlFor="acad-founded"
            className="block text-sm font-medium text-neutral-300"
          >
            Fecha de fundación{" "}
            <span className="text-neutral-500 font-normal">(opcional)</span>
          </label>
          <input
            id="acad-founded"
            name="foundedDate"
            type="date"
            defaultValue={foundedDate ?? ""}
            disabled={isPending}
            className={inputClass}
          />
        </div>

        {/* Dirección */}
        <div className="sm:col-span-2 space-y-1">
          <label
            htmlFor="acad-address"
            className="block text-sm font-medium text-neutral-300"
          >
            Dirección{" "}
            <span className="text-neutral-500 font-normal">(opcional)</span>
          </label>
          <input
            id="acad-address"
            name="address"
            type="text"
            defaultValue={address ?? ""}
            disabled={isPending}
            className={inputClass}
            placeholder="Av. Ejemplo 123"
          />
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
          ✓ Academia actualizada correctamente
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

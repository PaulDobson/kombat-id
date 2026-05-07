"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { updateRefereeRegistrationAction } from "../actions/adminRefereeActions";
import type { RefereeRegistrationRow } from "./RefereeRegistrationTable";

const EditSchema = z.object({
  fullName: z
    .string()
    .min(2, "El nombre completo debe tener al menos 2 caracteres")
    .max(200, "El nombre completo no puede superar los 200 caracteres"),
  country: z
    .string()
    .min(1, "El país es obligatorio")
    .max(100, "El país no puede superar los 100 caracteres"),
  registrationNumber: z
    .string()
    .min(1, "El número de registro es obligatorio")
    .max(100, "El número de registro no puede superar los 100 caracteres"),
});

type FormErrors = Partial<Record<string, string>>;

const inputClass =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50";

interface Props {
  registration: RefereeRegistrationRow;
}

export function EditRegistrationForm({ registration }: Props) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    const rawPayload = {
      fullName: data.get("fullName") as string,
      country: data.get("country") as string,
      registrationNumber: data.get("registrationNumber") as string,
    };

    const parsed = EditSchema.safeParse(rawPayload);
    if (!parsed.success) {
      const errors: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      const result = await updateRefereeRegistrationAction({
        id: registration.id,
        ...parsed.data,
      });

      if (result.success) {
        setSuccessMessage("Registro actualizado correctamente.");
      } else {
        setGlobalError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {/* Email — read-only */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-400">
          Email{" "}
          <span className="text-neutral-600 font-normal">(no editable)</span>
        </label>
        <input
          type="email"
          value={registration.email}
          readOnly
          disabled
          className={`${inputClass} cursor-not-allowed opacity-50`}
        />
      </div>

      {/* Nombre completo */}
      <div className="space-y-1">
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
          defaultValue={registration.fullName}
          disabled={isPending}
          className={inputClass}
        />
        {fieldErrors.fullName && (
          <p className="text-xs text-error-400">{fieldErrors.fullName}</p>
        )}
      </div>

      {/* País */}
      <div className="space-y-1">
        <label
          htmlFor="country"
          className="block text-sm font-medium text-neutral-300"
        >
          País
        </label>
        <input
          id="country"
          name="country"
          type="text"
          required
          defaultValue={registration.country}
          disabled={isPending}
          className={inputClass}
        />
        {fieldErrors.country && (
          <p className="text-xs text-error-400">{fieldErrors.country}</p>
        )}
      </div>

      {/* Número de registro */}
      <div className="space-y-1">
        <label
          htmlFor="registrationNumber"
          className="block text-sm font-medium text-neutral-300"
        >
          Número de registro oficial
        </label>
        <input
          id="registrationNumber"
          name="registrationNumber"
          type="text"
          required
          defaultValue={registration.registrationNumber}
          disabled={isPending}
          className={inputClass}
        />
        {fieldErrors.registrationNumber && (
          <p className="text-xs text-error-400">
            {fieldErrors.registrationNumber}
          </p>
        )}
      </div>

      {globalError && (
        <p
          role="alert"
          className="text-xs text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2"
        >
          {globalError}
        </p>
      )}

      {successMessage && (
        <p className="text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-700/40 rounded-lg px-3 py-2">
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}

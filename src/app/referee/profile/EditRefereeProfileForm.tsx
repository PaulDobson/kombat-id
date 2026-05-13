"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { updateRefereeOwnProfileAction } from "@/modules/referee-registration/presentation/actions/refereeProfileActions";

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
  registrationId: string;
  initialValues: {
    fullName: string;
    country: string;
    registrationNumber: string;
  };
}

export function EditRefereeProfileForm({
  registrationId,
  initialValues,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
      const result = await updateRefereeOwnProfileAction({
        id: registrationId,
        ...parsed.data,
      });

      if (result.success) {
        setSuccessMessage("Datos actualizados correctamente.");
        setOpen(false);
      } else {
        setGlobalError(result.error);
      }
    });
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-primary-400 hover:text-primary-300 transition-colors underline underline-offset-2"
        >
          Editar datos personales
        </button>
        {successMessage && (
          <span className="text-xs text-success-400">{successMessage}</span>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-neutral-700 bg-neutral-900/60 p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-200">
          Editar datos personales
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          Cancelar
        </button>
      </div>

      {globalError && (
        <p className="text-xs text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2">
          {globalError}
        </p>
      )}

      {/* Nombre completo */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">
          Nombre completo
        </label>
        <input
          name="fullName"
          type="text"
          defaultValue={initialValues.fullName}
          className={inputClass}
          disabled={isPending}
          autoComplete="name"
        />
        {fieldErrors.fullName && (
          <p className="text-xs text-error-400 mt-1">{fieldErrors.fullName}</p>
        )}
      </div>

      {/* País */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">
          País
        </label>
        <input
          name="country"
          type="text"
          defaultValue={initialValues.country}
          className={inputClass}
          disabled={isPending}
          autoComplete="country-name"
        />
        {fieldErrors.country && (
          <p className="text-xs text-error-400 mt-1">{fieldErrors.country}</p>
        )}
      </div>

      {/* Número de registro */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">
          Número de registro
        </label>
        <input
          name="registrationNumber"
          type="text"
          defaultValue={initialValues.registrationNumber}
          className={inputClass}
          disabled={isPending}
          autoComplete="off"
        />
        {fieldErrors.registrationNumber && (
          <p className="text-xs text-error-400 mt-1">
            {fieldErrors.registrationNumber}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
      >
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}

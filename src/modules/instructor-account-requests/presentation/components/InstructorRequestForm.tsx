"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { submitInstructorAccountRequestAction } from "../actions/instructorAccountRequestActions";

// ---------------------------------------------------------------------------
// Client-side validation schema
// Mirrors the server-side SubmitInstructorAccountRequestInput rules.
// Validates: Requirements 1.4, 1.6, 1.7, 1.8, 1.9, 1.10
// ---------------------------------------------------------------------------

const FormSchema = z.object({
  email: z
    .string()
    .email("El email debe tener un formato válido")
    .max(254, "El email no puede superar los 254 caracteres"),
  fullName: z
    .string()
    .min(2, "El nombre completo debe tener al menos 2 caracteres")
    .max(200, "El nombre completo no puede superar los 200 caracteres"),
  rut: z
    .string()
    .min(1, "El RUT es requerido")
    .max(12, "El RUT no puede superar los 12 caracteres")
    .regex(
      /^\d{1,8}-[\dkK]$/,
      "El RUT debe tener el formato 12345678-9 (sin puntos)",
    ),
  phone: z
    .string()
    .max(30, "El teléfono no puede superar los 30 caracteres")
    .optional(),
  academyName: z
    .string()
    .max(200, "El nombre de la academia no puede superar los 200 caracteres")
    .optional(),
  message: z
    .string()
    .max(1000, "El mensaje no puede superar los 1000 caracteres")
    .optional(),
});

type FormErrors = Partial<Record<string, string>>;

const inputClass =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50";

// ---------------------------------------------------------------------------
// Component
// Validates: Requirements 1.1, 1.3, 1.4, 1.13, 2.3
// ---------------------------------------------------------------------------

export function InstructorRequestForm() {
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);
    setFieldErrors({});

    const form = e.currentTarget;
    const data = new FormData(form);

    const rawPayload = {
      email: data.get("email") as string,
      fullName: data.get("fullName") as string,
      rut: data.get("rut") as string,
      phone: (data.get("phone") as string) || undefined,
      academyName: (data.get("academyName") as string) || undefined,
      message: (data.get("message") as string) || undefined,
    };

    // Client-side field validation — Requirement 1.4
    const parsed = FormSchema.safeParse(rawPayload);
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
      const result = await submitInstructorAccountRequestAction({
        email: parsed.data.email,
        fullName: parsed.data.fullName,
        rut: parsed.data.rut,
        phone: parsed.data.phone ?? null,
        academyName: parsed.data.academyName ?? null,
        message: parsed.data.message ?? null,
      });

      if (result.success) {
        // Requirement 1.3: show confirmation and clear the form
        setSuccess(true);
        form.reset();
      } else {
        if (result.code === "CONFLICT") {
          // Requirement 2.3: show error on email field without clearing other fields
          setFieldErrors((prev) => ({
            ...prev,
            email: result.error,
          }));
        } else {
          // Requirement 1.13: global error with role="alert" for other errors
          setGlobalError(result.error);
        }
      }
    });
  }

  // Requirement 1.3: inline confirmation message after successful submission
  if (success) {
    return (
      <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/20 px-6 py-8 text-center space-y-2">
        <p className="text-emerald-400 font-semibold text-lg">
          ¡Solicitud recibida!
        </p>
        <p className="text-neutral-300 text-sm">
          Tu solicitud de cuenta de instructor está pendiente de revisión. Te
          contactaremos al email proporcionado una vez que sea procesada.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {/* Email — required */}
      <div className="space-y-1">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-neutral-300"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={isPending}
          className={inputClass}
          placeholder="tu@email.com"
        />
        {fieldErrors.email && (
          <p className="text-xs text-error-400">{fieldErrors.email}</p>
        )}
      </div>

      {/* Nombre completo — required */}
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
          autoComplete="name"
          disabled={isPending}
          className={inputClass}
          placeholder="Juan Pérez González"
        />
        {fieldErrors.fullName && (
          <p className="text-xs text-error-400">{fieldErrors.fullName}</p>
        )}
      </div>

      {/* RUT — required */}
      <div className="space-y-1">
        <label
          htmlFor="rut"
          className="block text-sm font-medium text-neutral-300"
        >
          RUT
        </label>
        <input
          id="rut"
          name="rut"
          type="text"
          required
          disabled={isPending}
          className={inputClass}
          placeholder="12345678-9"
        />
        <p className="text-xs text-neutral-500">
          Sin puntos, con guión. Ej: 12345678-9
        </p>
        {fieldErrors.rut && (
          <p className="text-xs text-error-400">{fieldErrors.rut}</p>
        )}
      </div>

      {/* Teléfono — optional */}
      <div className="space-y-1">
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-neutral-300"
        >
          Teléfono{" "}
          <span className="text-neutral-500 font-normal">(opcional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          disabled={isPending}
          className={inputClass}
          placeholder="+56 9 1234 5678"
        />
        {fieldErrors.phone && (
          <p className="text-xs text-error-400">{fieldErrors.phone}</p>
        )}
      </div>

      {/* Academia — optional */}
      <div className="space-y-1">
        <label
          htmlFor="academyName"
          className="block text-sm font-medium text-neutral-300"
        >
          Academia o club{" "}
          <span className="text-neutral-500 font-normal">(opcional)</span>
        </label>
        <input
          id="academyName"
          name="academyName"
          type="text"
          disabled={isPending}
          className={inputClass}
          placeholder="Academia Kombat Santiago"
        />
        {fieldErrors.academyName && (
          <p className="text-xs text-error-400">{fieldErrors.academyName}</p>
        )}
      </div>

      {/* Mensaje — optional textarea */}
      <div className="space-y-1">
        <label
          htmlFor="message"
          className="block text-sm font-medium text-neutral-300"
        >
          Mensaje{" "}
          <span className="text-neutral-500 font-normal">(opcional)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          disabled={isPending}
          className={`${inputClass} resize-none`}
          placeholder="Cuéntanos sobre tu experiencia como instructor..."
        />
        {fieldErrors.message && (
          <p className="text-xs text-error-400">{fieldErrors.message}</p>
        )}
      </div>

      {/* Global error — Requirement 1.13 */}
      {globalError && (
        <p
          role="alert"
          className="text-xs text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2"
        >
          {globalError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Enviando..." : "Enviar solicitud de cuenta"}
      </button>
    </form>
  );
}

"use client";

import { useTransition, useState } from "react";
import * as Label from "@radix-ui/react-label";
import { resetPasswordAction } from "@/app/auth/actions";

export function ResetPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await resetPasswordAction(formData);
      if (result.success) {
        setSuccess(
          result.data ?? "Revisa tu correo para el enlace de recuperación.",
        );
      } else {
        setError(result.error);
      }
    });
  }

  if (success) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success-500/10 border border-success-500/20">
          <svg
            className="w-6 h-6 text-success-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-sm text-success-400 font-medium">{success}</p>
        <p className="text-xs text-neutral-500">
          Si no ves el correo, revisa tu carpeta de spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <Label.Root
          htmlFor="email"
          className="block text-sm font-medium text-neutral-300"
        >
          Correo electrónico
        </Label.Root>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="tu@correo.cl"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-xs text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Enviando..." : "Enviar enlace de recuperación"}
      </button>
    </form>
  );
}

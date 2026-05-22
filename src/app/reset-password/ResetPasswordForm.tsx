"use client";

import { useTransition, useState } from "react";
import { resetPasswordAction } from "@/app/auth/actions";

export function ResetPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<{
    type: "idle" | "success" | "error";
    message?: string;
  }>({ type: "idle" });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await resetPasswordAction(formData);
      if (result.success) {
        setState({ type: "success", message: result.data });
      } else {
        setState({ type: "error", message: result.error });
      }
    });
  }

  if (state.type === "success") {
    return (
      <div className="flex items-start gap-3 bg-success-500/10 border border-success-500/20 rounded-xl p-4">
        <svg
          className="w-5 h-5 text-success-400 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="space-y-1">
          <p className="text-sm font-medium text-success-400">Correo enviado</p>
          <p className="text-xs text-neutral-400">
            {state.message ??
              "Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-neutral-300"
        >
          Correo electrónico
        </label>
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
            aria-hidden="true"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </span>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isPending}
            className="w-full pl-9 pr-4 py-2.5 bg-neutral-800/80 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="tu@correo.cl"
          />
        </div>
      </div>

      {state.type === "error" && (
        <p
          role="alert"
          className="text-xs text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-neutral-100 hover:bg-white text-neutral-900 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Enviando..." : "Enviar enlace de recuperación"}
      </button>
    </form>
  );
}

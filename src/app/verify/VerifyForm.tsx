"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Mode = "cert" | "qr";

export function VerifyForm() {
  const [mode, setMode] = useState<Mode>("cert");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Ingresa un ID válido.");
      return;
    }
    startTransition(() => {
      if (mode === "cert") {
        router.push(`/verify/cert/${encodeURIComponent(trimmed)}`);
      } else {
        router.push(`/verify/qr/${encodeURIComponent(trimmed)}`);
      }
    });
  }

  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 sm:p-8 space-y-6 text-left shadow-2xl">
      {/* Mode toggle */}
      <div className="flex rounded-xl bg-neutral-800 p-1 gap-1" role="tablist">
        <button
          role="tab"
          aria-selected={mode === "cert"}
          onClick={() => {
            setMode("cert");
            setValue("");
            setError(null);
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            mode === "cert"
              ? "bg-neutral-700 text-neutral-50 shadow-sm"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Certificación
        </button>
        <button
          role="tab"
          aria-selected={mode === "qr"}
          onClick={() => {
            setMode("qr");
            setValue("");
            setError(null);
          }}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            mode === "qr"
              ? "bg-neutral-700 text-neutral-50 shadow-sm"
              : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Practicante
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-neutral-500">
        {mode === "cert"
          ? "Verifica si una certificación oficial es válida y vigente ingresando su ID único."
          : "Verifica la identidad y grado de un practicante ingresando su token QR."}
      </p>

      {/* Input */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="verify-id"
            className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2"
          >
            {mode === "cert"
              ? "ID de certificación"
              : "Token QR del practicante"}
          </label>
          <input
            id="verify-id"
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder={
              mode === "cert"
                ? "ej: 550e8400-e29b-41d4-a716-446655440000"
                : "ej: abc123xyz"
            }
            disabled={isPending}
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono disabled:opacity-50 transition-shadow"
          />
        </div>

        {error && (
          <p role="alert" className="text-xs text-rose-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || !value.trim()}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-semibold transition-colors"
        >
          {isPending ? "Verificando..." : "Verificar ahora"}
        </button>
      </form>
    </div>
  );
}

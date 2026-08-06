"use client";

import { useState, useTransition } from "react";
import { Mail, CheckCircle2, AlertTriangle } from "lucide-react";
import { dispatchWelcomeEmailsAction } from "../../actions/onboardingActions";
import type { SessionStudent } from "../types";

interface WelcomeEmailsStepProps {
  students: SessionStudent[];
  onComplete: () => void;
}

export function WelcomeEmailsStep({
  students,
  onComplete,
}: WelcomeEmailsStepProps) {
  const [sent, setSent] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDispatch() {
    setError(null);
    startTransition(async () => {
      const result = await dispatchWelcomeEmailsAction({ students });
      if (result.success) {
        setSent(true);
        setFailedCount(result.data.failedCount);
        // Auto-advance after brief delay
        setTimeout(() => onComplete(), 1500);
      } else {
        setError(result.error);
      }
    });
  }

  if (students.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-neutral-50 mb-1">
            Correos de bienvenida
          </h3>
          <p className="text-sm text-neutral-400">
            No hay alumnos registrados en esta sesión.
          </p>
        </div>
        <button
          type="button"
          onClick={onComplete}
          className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-semibold rounded-xl py-2.5 text-sm transition-colors"
        >
          Omitir y continuar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-neutral-50 mb-1">
          Correos de bienvenida
        </h3>
        <p className="text-sm text-neutral-400">
          Envía las credenciales de acceso a los alumnos registrados.
        </p>
      </div>

      {/* Student list */}
      <div className="space-y-2">
        {students.map((student) => (
          <div
            key={student.practitionerId}
            className="flex items-center gap-3 px-4 py-2.5 bg-neutral-800/50 border border-neutral-700 rounded-xl"
          >
            {sent ? (
              failedCount > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )
            ) : (
              <Mail className="w-4 h-4 text-neutral-500 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-neutral-200">
                {student.fullName}
              </p>
              <p className="text-xs text-neutral-500">{student.email}</p>
            </div>
          </div>
        ))}
      </div>

      {sent && failedCount > 0 && (
        <p className="text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-2.5">
          {failedCount} correo{failedCount !== 1 ? "s" : ""} no pudo
          {failedCount !== 1 ? "ron" : ""} enviarse. El paso se marcará como
          completado de todas formas.
        </p>
      )}

      {sent && failedCount === 0 && (
        <p className="text-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-2.5">
          ¡Correos enviados con éxito!
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      {!sent && (
        <button
          type="button"
          disabled={isPending}
          onClick={handleDispatch}
          className="w-full bg-primary-500 hover:bg-primary-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-neutral-900 font-semibold rounded-xl py-2.5 text-sm transition-colors"
        >
          {isPending
            ? "Enviando correos..."
            : `Enviar ${students.length} correo${students.length !== 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}

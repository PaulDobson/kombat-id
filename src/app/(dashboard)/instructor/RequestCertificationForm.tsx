"use client";

import { useState, useTransition } from "react";
import { requestCertificationAction } from "@/modules/practitioner-identity/presentation/actions/instructorActions";

const CERT_TYPE_LABELS: Record<string, string> = {
  technical_grade: "Grado técnico",
  instructor: "Instructor",
  referee: "Árbitro",
  coach: "Entrenador",
  event_participation: "Participación en evento",
};

interface Student {
  id: string;
  fullName: string;
  rut: string;
}

interface Props {
  students: Student[];
}

export function RequestCertificationForm({ students }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const practitionerId = data.get("practitionerId") as string;
    const certType = data.get("certType") as string;
    const notes = (data.get("notes") as string).trim() || undefined;

    if (!practitionerId || !certType) {
      setStatus({
        type: "error",
        message: "Selecciona un alumno y un tipo de certificación.",
      });
      return;
    }

    setStatus(null);
    startTransition(async () => {
      const result = await requestCertificationAction({
        practitionerId,
        certType,
        notes,
      });
      if (result.success) {
        setStatus({
          type: "success",
          message:
            "Solicitud enviada correctamente. Un administrador la revisará pronto.",
        });
        form.reset();
      } else {
        setStatus({ type: "error", message: result.error });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Student select */}
      <div>
        <label
          htmlFor="cert-practitioner"
          className="block text-sm font-medium text-neutral-300 mb-1"
        >
          Alumno
        </label>
        {students.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No tienes alumnos activos asignados.
          </p>
        ) : (
          <select
            id="cert-practitioner"
            name="practitionerId"
            required
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Seleccionar alumno...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName} — {s.rut}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Cert type select */}
      <div>
        <label
          htmlFor="cert-type"
          className="block text-sm font-medium text-neutral-300 mb-1"
        >
          Tipo de certificación
        </label>
        <select
          id="cert-type"
          name="certType"
          required
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Seleccionar tipo...</option>
          {Object.entries(CERT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="cert-notes"
          className="block text-sm font-medium text-neutral-300 mb-1"
        >
          Notas <span className="text-neutral-500 font-normal">(opcional)</span>
        </label>
        <textarea
          id="cert-notes"
          name="notes"
          rows={3}
          placeholder="Información adicional para el administrador..."
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Feedback */}
      {status && (
        <p
          role="alert"
          className={`text-sm ${status.type === "success" ? "text-emerald-400" : "text-rose-400"}`}
        >
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || students.length === 0}
        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}

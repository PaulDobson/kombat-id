"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Label from "@radix-ui/react-label";
import { startExamAction } from "@/modules/grade-exam/presentation/actions/instructorExamActions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRADE_OPTIONS = [
  { value: "white", label: "Blanco" },
  { value: "yellow", label: "Amarillo" },
  { value: "green", label: "Verde" },
  { value: "blue", label: "Azul" },
  { value: "red", label: "Rojo" },
  { value: "black", label: "Negro" },
] as const;

type Grade = (typeof GRADE_OPTIONS)[number]["value"];

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const inputCls =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50";

const selectCls =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Student {
  id: string;
  fullName: string;
  rut: string;
  grade: string;
}

interface StartExamFormProps {
  students: Student[];
  preselectedPractitionerId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StartExamForm({
  students,
  preselectedPractitionerId,
}: StartExamFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultStudent =
    preselectedPractitionerId &&
    students.some((s) => s.id === preselectedPractitionerId)
      ? preselectedPractitionerId
      : (students[0]?.id ?? "");

  const [practitionerId, setPractitionerId] = useState(defaultStudent);
  const [toGrade, setToGrade] = useState<Grade>("yellow");
  const [examDate, setExamDate] = useState(todayIso());
  const [discipline, setDiscipline] = useState("kombat_taekwondo");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!practitionerId) {
      setError("Debes seleccionar un alumno.");
      return;
    }

    startTransition(async () => {
      const result = await startExamAction({
        practitionerId,
        toGrade,
        discipline,
        examDate,
      });

      if (result.success) {
        router.push(`/instructor/grade-exams/${result.data.examId}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-4">
        {/* Student selector */}
        <div className="space-y-1">
          <Label.Root
            htmlFor="practitionerId"
            className="block text-sm font-medium text-neutral-300"
          >
            Alumno
          </Label.Root>
          {students.length === 0 ? (
            <p className="text-sm text-neutral-500 py-2">
              No tienes alumnos activos asignados.
            </p>
          ) : (
            <select
              id="practitionerId"
              value={practitionerId}
              onChange={(e) => setPractitionerId(e.target.value)}
              required
              disabled={isPending}
              className={selectCls}
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} — {s.rut}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Target grade */}
        <div className="space-y-1">
          <Label.Root
            htmlFor="toGrade"
            className="block text-sm font-medium text-neutral-300"
          >
            Grado objetivo
          </Label.Root>
          <select
            id="toGrade"
            value={toGrade}
            onChange={(e) => setToGrade(e.target.value as Grade)}
            required
            disabled={isPending}
            className={selectCls}
          >
            {GRADE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Exam date */}
        <div className="space-y-1">
          <Label.Root
            htmlFor="examDate"
            className="block text-sm font-medium text-neutral-300"
          >
            Fecha del examen
          </Label.Root>
          <input
            id="examDate"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            required
            disabled={isPending}
            className={inputCls}
          />
        </div>

        {/* Discipline */}
        <div className="space-y-1">
          <Label.Root
            htmlFor="discipline"
            className="block text-sm font-medium text-neutral-300"
          >
            Disciplina
          </Label.Root>
          <input
            id="discipline"
            type="text"
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value)}
            required
            disabled={isPending}
            placeholder="kombat_taekwondo"
            className={inputCls}
          />
        </div>
      </div>

      {/* Error feedback */}
      {error && (
        <p
          role="alert"
          className="text-xs text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending || students.length === 0}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Iniciando..." : "Iniciar examen"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/instructor/grade-exams")}
          disabled={isPending}
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

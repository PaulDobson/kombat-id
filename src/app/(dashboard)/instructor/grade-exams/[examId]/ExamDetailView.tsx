import type { GradeExam } from "@/modules/grade-exam/domain/entities/gradeExam";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  pending_authorization: "Pendiente de autorización",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-neutral-800 text-neutral-400 border-neutral-700",
  submitted: "bg-blue-900/40 text-blue-400 border-blue-800",
  pending_authorization: "bg-amber-900/40 text-amber-400 border-amber-800",
  approved: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
  rejected: "bg-rose-900/40 text-rose-400 border-rose-800",
};

const RESULT_LABELS: Record<string, string> = {
  approved: "Aprobado",
  failed: "Reprobado",
};

const RESULT_COLORS: Record<string, string> = {
  approved: "text-emerald-400",
  failed: "text-rose-400",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExamDetailViewProps {
  exam: GradeExam;
  practitionerName: string;
  instructorName?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Reusable read-only exam detail view.
 * Displays full exam info: items, scores, result, override, and federation stamp.
 *
 * Validates: Requirements 8.2, 8.4
 */
export function ExamDetailView({
  exam,
  practitionerName,
  instructorName,
}: ExamDetailViewProps) {
  const statusClass =
    STATUS_COLORS[exam.status] ??
    "bg-neutral-800 text-neutral-400 border-neutral-700";

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Print header */}
      <div className="hidden print:block text-center mb-6">
        <h2 className="text-xl font-bold">Ficha de Examen de Grado</h2>
        <p className="text-sm text-neutral-600 mt-1">
          Federación Kombat — Documento oficial
        </p>
      </div>

      {/* 1. General info */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 print:border-neutral-300 print:bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-neutral-50 print:text-neutral-900">
            Información general
          </h2>
          <span
            className={`border px-2 py-0.5 rounded-full text-xs ${statusClass} print:hidden`}
          >
            {STATUS_LABELS[exam.status] ?? exam.status}
          </span>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1 print:text-neutral-600">
              Alumno
            </dt>
            <dd className="text-neutral-200 print:text-neutral-900">
              {practitionerName}
            </dd>
          </div>
          {instructorName && (
            <div>
              <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1 print:text-neutral-600">
                Instructor
              </dt>
              <dd className="text-neutral-200 print:text-neutral-900">
                {instructorName}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1 print:text-neutral-600">
              Transición
            </dt>
            <dd className="text-neutral-200 print:text-neutral-900">
              {GRADE_LABELS[exam.fromGrade] ?? exam.fromGrade}
              {" → "}
              {GRADE_LABELS[exam.toGrade] ?? exam.toGrade}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1 print:text-neutral-600">
              Fecha
            </dt>
            <dd className="text-neutral-200 print:text-neutral-900">
              {exam.examDate}
            </dd>
          </div>
        </dl>
      </div>

      {/* 2. Score summary */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 print:border-neutral-300 print:bg-white">
        <h2 className="text-sm font-semibold text-neutral-50 mb-4 print:text-neutral-900">
          Resumen de puntaje
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1 print:text-neutral-600">
              Puntaje total
            </dt>
            <dd className="text-neutral-200 tabular-nums print:text-neutral-900">
              {exam.totalScore} / {exam.maxPossibleScore} pts
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1 print:text-neutral-600">
              Porcentaje
            </dt>
            <dd className="text-neutral-200 tabular-nums print:text-neutral-900">
              {exam.scorePercentage.toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1 print:text-neutral-600">
              Resultado calculado
            </dt>
            <dd
              className={
                RESULT_COLORS[exam.calculatedResult] ?? "text-neutral-200"
              }
            >
              {RESULT_LABELS[exam.calculatedResult] ?? exam.calculatedResult}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1 print:text-neutral-600">
              Resultado final
            </dt>
            <dd
              className={`font-semibold ${RESULT_COLORS[exam.finalResult] ?? "text-neutral-200"}`}
            >
              {RESULT_LABELS[exam.finalResult] ?? exam.finalResult}
            </dd>
          </div>
        </dl>
      </div>

      {/* 3. Items table */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden print:border-neutral-300 print:bg-white">
        <div className="px-5 py-4 border-b border-neutral-700 print:border-neutral-300 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-50 print:text-neutral-900">
            Ítems evaluados
          </h2>
          <span className="text-xs text-neutral-400 tabular-nums print:text-neutral-600">
            {exam.totalScore} / {exam.maxPossibleScore} pts
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700 print:border-neutral-300 bg-neutral-900/80 print:bg-neutral-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider print:text-neutral-600">
                  Ítem
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider w-32 print:text-neutral-600">
                  Máx.
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider w-32 print:text-neutral-600">
                  Puntaje
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 print:divide-neutral-200">
              {exam.items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-neutral-800/40 print:hover:bg-transparent"
                >
                  <td className="px-5 py-3 text-neutral-100 print:text-neutral-900">
                    {item.itemName}
                  </td>
                  <td className="px-5 py-3 text-neutral-400 tabular-nums text-right print:text-neutral-600">
                    {item.maxScore}
                  </td>
                  <td className="px-5 py-3 text-neutral-200 tabular-nums text-right font-medium print:text-neutral-900">
                    {item.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Override section */}
      {exam.instructorOverride && (
        <div className="bg-neutral-900 border border-amber-700/40 rounded-xl p-6 print:border-neutral-300 print:bg-white">
          <h2 className="text-sm font-semibold text-amber-400 mb-3 print:text-neutral-900">
            Override del instructor
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1 print:text-neutral-600">
                Resultado override
              </dt>
              <dd
                className={
                  RESULT_COLORS[exam.overrideResult ?? ""] ?? "text-neutral-200"
                }
              >
                {exam.overrideResult
                  ? (RESULT_LABELS[exam.overrideResult] ?? exam.overrideResult)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1 print:text-neutral-600">
                Justificación
              </dt>
              <dd className="text-neutral-200 print:text-neutral-900">
                {exam.overrideJustification ?? "—"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* 5. Federation stamp / visado (status = "approved") */}
      {exam.status === "approved" && (
        <div className="bg-neutral-900 border border-emerald-700/40 rounded-xl p-6 print:border-neutral-300 print:bg-white">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 bg-emerald-900/40 text-emerald-400 border border-emerald-700/60 px-3 py-1 rounded-full text-xs font-semibold print:hidden">
              ✓ Visado Federación Kombat
            </span>
            <span className="hidden print:inline text-sm font-bold text-neutral-900">
              ✓ Visado Federación Kombat
            </span>
          </div>
          <h2 className="text-sm font-semibold text-emerald-400 mb-3 print:text-neutral-900">
            {exam.authorizedBy
              ? "Autorización del administrador"
              : "Aprobación automática"}
          </h2>
          {exam.authorizedBy ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1 print:text-neutral-600">
                  Autorizado por
                </dt>
                <dd className="text-neutral-200 print:text-neutral-900">
                  {exam.authorizedBy}
                </dd>
              </div>
              {exam.authorizedAt && (
                <div>
                  <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1 print:text-neutral-600">
                    Fecha de autorización
                  </dt>
                  <dd className="text-neutral-200 print:text-neutral-900">
                    {exam.authorizedAt.slice(0, 10)}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-neutral-400 print:text-neutral-600">
              Aprobado automáticamente por el sistema.
            </p>
          )}
        </div>
      )}

      {/* 6. Rejection info */}
      {exam.status === "rejected" && (
        <div className="bg-neutral-900 border border-rose-700/40 rounded-xl p-6 print:border-neutral-300 print:bg-white">
          <h2 className="text-sm font-semibold text-rose-400 mb-3 print:text-neutral-900">
            Información de rechazo
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1 print:text-neutral-600">
                Rechazado por
              </dt>
              <dd className="text-neutral-200 print:text-neutral-900">
                {exam.rejectedBy ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1 print:text-neutral-600">
                Motivo
              </dt>
              <dd className="text-neutral-200 print:text-neutral-900">
                {exam.rejectionReason ?? "—"}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

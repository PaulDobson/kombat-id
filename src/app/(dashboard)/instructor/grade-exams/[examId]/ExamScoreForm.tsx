"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  saveExamDraftAction,
  submitExamAction,
} from "@/modules/grade-exam/presentation/actions/instructorExamActions";
import { calculateExamScore } from "@/modules/grade-exam/domain/entities/gradeExam";
import type {
  GradeExam,
  GradeExamItem,
} from "@/modules/grade-exam/domain/entities/gradeExam";

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
// Styles
// ---------------------------------------------------------------------------

const inputCls =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50 tabular-nums";

const inputErrorCls =
  "w-full px-3 py-2 bg-neutral-800 border border-rose-600 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-shadow disabled:opacity-50 tabular-nums";

const selectCls =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50";

const textareaCls =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:opacity-50";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExamScoreFormProps {
  exam: GradeExam;
  minimumPassScore: number;
  practitionerName: string;
}

// ---------------------------------------------------------------------------
// Read-only view (exam no longer in "draft")
// ---------------------------------------------------------------------------

function ReadOnlyView({ exam, practitionerName }: ExamScoreFormProps) {
  const statusClass =
    STATUS_COLORS[exam.status] ??
    "bg-neutral-800 text-neutral-400 border-neutral-700";

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Print header (only visible when printing) */}
      <div className="hidden print:block text-center mb-6">
        <h2 className="text-xl font-bold">Ficha de Examen de Grado</h2>
        <p className="text-sm text-neutral-600 mt-1">
          Federación Kombat — Documento oficial
        </p>
      </div>

      {/* General info */}
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
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1 print:text-neutral-600">
              Puntaje %
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

      {/* Items table */}
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

      {/* Override info */}
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

      {/* Authorization info */}
      {exam.status === "approved" && (
        <div className="bg-neutral-900 border border-emerald-700/40 rounded-xl p-6 print:border-neutral-300 print:bg-white">
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

      {/* Rejection info */}
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

      {/* Print button */}
      <div className="flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Imprimir
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable form (exam in "draft")
// ---------------------------------------------------------------------------

function EditableForm({
  exam,
  minimumPassScore,
  practitionerName,
}: ExamScoreFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Score state: map from itemId → string (raw input value)
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const item of exam.items) {
      init[item.id] = String(item.score);
    }
    return init;
  });

  // Override state
  const [overrideEnabled, setOverrideEnabled] = useState(
    exam.instructorOverride,
  );
  const [overrideResult, setOverrideResult] = useState<"approved" | "failed">(
    exam.overrideResult ?? "approved",
  );
  const [overrideJustification, setOverrideJustification] = useState(
    exam.overrideJustification ?? "",
  );
  const [showConfirm, setShowConfirm] = useState(false);

  // Validation errors per item
  const scoreErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    for (const item of exam.items) {
      const raw = scoreInputs[item.id] ?? "";
      const val = parseFloat(raw);
      if (raw === "" || isNaN(val)) {
        errors[item.id] = "Requerido";
      } else if (val < 0) {
        errors[item.id] = "Mínimo 0";
      } else if (val > item.maxScore) {
        errors[item.id] = `Máximo ${item.maxScore}`;
      }
    }
    return errors;
  }, [scoreInputs, exam.items]);

  const hasScoreErrors = Object.keys(scoreErrors).length > 0;

  // Real-time calculation
  const liveCalc = useMemo(() => {
    const liveItems: GradeExamItem[] = exam.items.map((item) => {
      const raw = scoreInputs[item.id] ?? "0";
      const val = parseFloat(raw);
      return {
        ...item,
        score: isNaN(val) ? 0 : Math.max(0, Math.min(val, item.maxScore)),
      };
    });
    return calculateExamScore(liveItems, minimumPassScore);
  }, [scoreInputs, exam.items, minimumPassScore]);

  const liveResult = overrideEnabled
    ? overrideResult
    : liveCalc.calculatedResult;

  // Build scores array for actions
  function buildScores() {
    return exam.items.map((item) => ({
      itemId: item.id,
      score: parseFloat(scoreInputs[item.id] ?? "0") || 0,
    }));
  }

  function handleScoreChange(itemId: string, value: string) {
    setScoreInputs((prev) => ({ ...prev, [itemId]: value }));
    setError(null);
    setSuccessMsg(null);
  }

  function handleSaveDraft() {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await saveExamDraftAction({
        examId: exam.id,
        scores: buildScores(),
      });
      if (result.success) {
        setSuccessMsg("Borrador guardado correctamente.");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function handleSubmit() {
    if (hasScoreErrors) {
      setError("Corrige los errores de puntaje antes de enviar.");
      return;
    }
    if (overrideEnabled && !overrideJustification.trim()) {
      setError("La justificación del override es obligatoria.");
      return;
    }
    setShowConfirm(true);
  }

  function handleConfirmSubmit() {
    setShowConfirm(false);
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await submitExamAction({
        examId: exam.id,
        scores: buildScores(),
      });
      if (result.success) {
        router.push("/instructor/grade-exams");
      } else {
        setError(result.error);
      }
    });
  }

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

      {/* General info */}
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
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Alumno
            </dt>
            <dd className="text-neutral-200">{practitionerName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Transición
            </dt>
            <dd className="text-neutral-200">
              {GRADE_LABELS[exam.fromGrade] ?? exam.fromGrade}
              {" → "}
              {GRADE_LABELS[exam.toGrade] ?? exam.toGrade}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Fecha
            </dt>
            <dd className="text-neutral-200">{exam.examDate}</dd>
          </div>
        </dl>
      </div>

      {/* Score entry per item */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden print:border-neutral-300 print:bg-white">
        <div className="px-5 py-4 border-b border-neutral-700 print:border-neutral-300">
          <h2 className="text-sm font-semibold text-neutral-50 print:text-neutral-900">
            Puntajes por ítem
          </h2>
        </div>
        <div className="divide-y divide-neutral-800 print:divide-neutral-200">
          {exam.items.map((item) => {
            const hasError = !!scoreErrors[item.id];
            return (
              <div
                key={item.id}
                className="px-5 py-4 flex items-center gap-4 print:py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-100 print:text-neutral-900 truncate">
                    {item.itemName}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Máximo: {item.maxScore} pts
                  </p>
                </div>
                <div className="w-28 shrink-0 print:hidden">
                  <input
                    type="number"
                    min={0}
                    max={item.maxScore}
                    step="any"
                    value={scoreInputs[item.id] ?? ""}
                    onChange={(e) => handleScoreChange(item.id, e.target.value)}
                    disabled={isPending}
                    aria-label={`Puntaje para ${item.itemName}`}
                    className={hasError ? inputErrorCls : inputCls}
                  />
                  {hasError && (
                    <p className="text-xs text-rose-400 mt-1">
                      {scoreErrors[item.id]}
                    </p>
                  )}
                </div>
                {/* Print: show blank line for manual entry */}
                <div className="hidden print:block w-20 border-b border-neutral-400 h-6" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time calculation summary */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 print:hidden">
        <h2 className="text-sm font-semibold text-neutral-50 mb-3">
          Resultado en tiempo real
        </h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">
              Puntaje total
            </p>
            <p className="text-neutral-200 tabular-nums font-medium">
              {liveCalc.totalScore.toFixed(1)} /{" "}
              {liveCalc.maxPossibleScore.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">
              Porcentaje
            </p>
            <p className="text-neutral-200 tabular-nums font-medium">
              {liveCalc.scorePercentage.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">
              Resultado
            </p>
            <p
              className={`font-semibold ${RESULT_COLORS[liveResult] ?? "text-neutral-200"}`}
            >
              {RESULT_LABELS[liveResult] ?? liveResult}
            </p>
          </div>
        </div>
        <p className="text-xs text-neutral-500 mt-3">
          Puntaje mínimo requerido: {minimumPassScore}%
        </p>
      </div>

      {/* Override section */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 print:hidden">
        <div className="flex items-center gap-3 mb-4">
          <input
            id="overrideEnabled"
            type="checkbox"
            checked={overrideEnabled}
            onChange={(e) => setOverrideEnabled(e.target.checked)}
            disabled={isPending}
            className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-primary-500 focus:ring-primary-500"
          />
          <label
            htmlFor="overrideEnabled"
            className="text-sm font-medium text-neutral-200 cursor-pointer"
          >
            Aplicar override del resultado
          </label>
        </div>

        {overrideEnabled && (
          <div className="space-y-4 pl-7">
            <div className="space-y-1">
              <label
                htmlFor="overrideResult"
                className="block text-sm font-medium text-neutral-300"
              >
                Resultado override
              </label>
              <select
                id="overrideResult"
                value={overrideResult}
                onChange={(e) =>
                  setOverrideResult(e.target.value as "approved" | "failed")
                }
                disabled={isPending}
                className={selectCls}
              >
                <option value="approved">Aprobado</option>
                <option value="failed">Reprobado</option>
              </select>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="overrideJustification"
                className="block text-sm font-medium text-neutral-300"
              >
                Justificación <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="overrideJustification"
                rows={3}
                value={overrideJustification}
                onChange={(e) => setOverrideJustification(e.target.value)}
                disabled={isPending}
                placeholder="Describe el motivo del override..."
                className={textareaCls}
              />
            </div>
          </div>
        )}
      </div>

      {/* Feedback */}
      {error && (
        <p
          role="alert"
          className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}
      {successMsg && (
        <p
          role="status"
          className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2"
        >
          {successMsg}
        </p>
      )}

      {/* Confirmation dialog */}
      {showConfirm && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-submit-title"
          aria-describedby="confirm-submit-desc"
          className="bg-neutral-800 border border-amber-700/50 rounded-xl p-5 space-y-3"
        >
          <p
            id="confirm-submit-title"
            className="text-sm font-semibold text-neutral-50"
          >
            ¿Confirmar envío del examen?
          </p>
          <p id="confirm-submit-desc" className="text-xs text-neutral-400">
            Esta acción no se puede deshacer. El examen será enviado para
            revisión.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={isPending}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Enviando..." : "Sí, enviar"}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
              className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isPending}
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Guardando..." : "Guardar borrador"}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || hasScoreErrors || showConfirm}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Enviando..." : "Enviar examen"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={isPending}
          className="ml-auto bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          Imprimir
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function ExamScoreForm({
  exam,
  minimumPassScore,
  practitionerName,
}: ExamScoreFormProps) {
  if (exam.status !== "draft") {
    return (
      <ReadOnlyView
        exam={exam}
        minimumPassScore={minimumPassScore}
        practitionerName={practitionerName}
      />
    );
  }
  return (
    <EditableForm
      exam={exam}
      minimumPassScore={minimumPassScore}
      practitionerName={practitionerName}
    />
  );
}

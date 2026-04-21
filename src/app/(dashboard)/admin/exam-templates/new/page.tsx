"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Label from "@radix-ui/react-label";
import { createExamTemplateAction } from "@/modules/grade-exam/presentation/actions/adminExamActions";

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

interface ItemDraft {
  name: string;
  description: string;
  maxScore: number;
}

// ---------------------------------------------------------------------------
// Input class helper
// ---------------------------------------------------------------------------

const inputCls =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50";

const selectCls =
  "w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewExamTemplatePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [fromGrade, setFromGrade] = useState<Grade>("white");
  const [toGrade, setToGrade] = useState<Grade>("yellow");
  const [discipline, setDiscipline] = useState("kombat_taekwondo");
  const [minimumPassScore, setMinimumPassScore] = useState(60);
  const [requiresAdminAuth, setRequiresAdminAuth] = useState(false);
  const [items, setItems] = useState<ItemDraft[]>([
    { name: "", description: "", maxScore: 10 },
  ]);

  // ---------------------------------------------------------------------------
  // Item helpers
  // ---------------------------------------------------------------------------

  function addItem() {
    setItems((prev) => [...prev, { name: "", description: "", maxScore: 10 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(
    index: number,
    field: keyof ItemDraft,
    value: string | number,
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const payload = {
      fromGrade,
      toGrade,
      discipline,
      minimumPassScore,
      requiresAdminAuth,
      items: items.map((item, idx) => ({
        name: item.name,
        description: item.description || null,
        maxScore: item.maxScore,
        order: idx,
      })),
    };

    startTransition(async () => {
      const result = await createExamTemplateAction(payload);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => router.push("/admin/exam-templates"), 1200);
      } else {
        setError(result.error);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Nueva pauta de evaluación
        </h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          Configura los criterios de evaluación para una transición de grado.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Grade transition */}
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-neutral-300 uppercase tracking-wider">
            Transición de grado
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label.Root
                htmlFor="fromGrade"
                className="block text-sm font-medium text-neutral-300"
              >
                Desde
              </Label.Root>
              <select
                id="fromGrade"
                value={fromGrade}
                onChange={(e) => setFromGrade(e.target.value as Grade)}
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
            <div className="space-y-1">
              <Label.Root
                htmlFor="toGrade"
                className="block text-sm font-medium text-neutral-300"
              >
                Hasta
              </Label.Root>
              <select
                id="toGrade"
                value={toGrade}
                onChange={(e) => setToGrade(e.target.value as Grade)}
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
              className={inputCls}
              placeholder="kombat_taekwondo"
            />
          </div>
        </div>

        {/* Scoring */}
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-neutral-300 uppercase tracking-wider">
            Configuración de puntaje
          </h2>
          <div className="space-y-1">
            <Label.Root
              htmlFor="minimumPassScore"
              className="block text-sm font-medium text-neutral-300"
            >
              Puntaje mínimo para aprobar (%)
            </Label.Root>
            <input
              id="minimumPassScore"
              type="number"
              min={0}
              max={100}
              value={minimumPassScore}
              onChange={(e) => setMinimumPassScore(Number(e.target.value))}
              required
              disabled={isPending}
              className={inputCls}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="requiresAdminAuth"
              type="checkbox"
              checked={requiresAdminAuth}
              onChange={(e) => setRequiresAdminAuth(e.target.checked)}
              disabled={isPending}
              className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-primary-600 focus:ring-primary-500 focus:ring-offset-neutral-900"
            />
            <Label.Root
              htmlFor="requiresAdminAuth"
              className="text-sm text-neutral-300 cursor-pointer"
            >
              Requiere autorización del administrador
            </Label.Root>
          </div>
        </div>

        {/* Items */}
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-300 uppercase tracking-wider">
              Ítems de evaluación
            </h2>
            <span className="text-xs text-neutral-500">
              {items.length} ítem{items.length !== 1 ? "s" : ""}
            </span>
          </div>

          {items.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-4">
              Agrega al menos un ítem de evaluación.
            </p>
          )}

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400">
                    Ítem #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={isPending}
                      className="text-xs text-error-400 hover:text-error-300 transition-colors disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <Label.Root
                      htmlFor={`item-name-${idx}`}
                      className="block text-xs font-medium text-neutral-400"
                    >
                      Nombre
                    </Label.Root>
                    <input
                      id={`item-name-${idx}`}
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(idx, "name", e.target.value)}
                      required
                      disabled={isPending}
                      className={inputCls}
                      placeholder="Ej: Patada frontal"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label.Root
                      htmlFor={`item-maxScore-${idx}`}
                      className="block text-xs font-medium text-neutral-400"
                    >
                      Puntaje máximo
                    </Label.Root>
                    <input
                      id={`item-maxScore-${idx}`}
                      type="number"
                      min={1}
                      value={item.maxScore}
                      onChange={(e) =>
                        updateItem(idx, "maxScore", Number(e.target.value))
                      }
                      required
                      disabled={isPending}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label.Root
                    htmlFor={`item-description-${idx}`}
                    className="block text-xs font-medium text-neutral-400"
                  >
                    Descripción{" "}
                    <span className="text-neutral-500 font-normal">
                      (opcional)
                    </span>
                  </Label.Root>
                  <input
                    id={`item-description-${idx}`}
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(idx, "description", e.target.value)
                    }
                    disabled={isPending}
                    className={inputCls}
                    placeholder="Descripción del criterio de evaluación"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            disabled={isPending}
            className="w-full py-2.5 border border-dashed border-neutral-600 hover:border-primary-500 text-neutral-400 hover:text-primary-400 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            + Agregar ítem
          </button>
        </div>

        {/* Feedback */}
        {error && (
          <p
            role="alert"
            className="text-xs text-error-400 bg-error-500/10 border border-error-500/20 rounded-lg px-3 py-2"
          >
            {error}
          </p>
        )}
        {success && (
          <p
            role="status"
            className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2"
          >
            Pauta creada correctamente. Redirigiendo...
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={isPending || items.length === 0}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Creando..." : "Crear pauta"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/exam-templates")}
            disabled={isPending}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </main>
  );
}

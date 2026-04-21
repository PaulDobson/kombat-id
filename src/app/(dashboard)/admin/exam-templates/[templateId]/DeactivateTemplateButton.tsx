"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { deactivateExamTemplateAction } from "@/modules/grade-exam/presentation/actions/adminExamActions";

interface Props {
  templateId: string;
}

export function DeactivateTemplateButton({ templateId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deactivateExamTemplateAction({ templateId });
      if (!result.success) {
        setError(result.error);
        setShowConfirm(false);
      } else {
        router.push("/admin/exam-templates");
      }
    });
  }

  if (showConfirm) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-neutral-300">
          ¿Confirmas que deseas desactivar esta pauta? Los exámenes en curso no
          se verán afectados.
        </p>
        {error && (
          <p role="alert" className="text-xs text-rose-400">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Desactivando..." : "Confirmar desactivación"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
    >
      Desactivar pauta
    </button>
  );
}

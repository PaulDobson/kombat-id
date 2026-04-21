"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  authorizeExamAction,
  rejectExamAction,
} from "@/modules/grade-exam/presentation/actions/adminExamActions";

interface Props {
  examId: string;
}

export function ExamAuthorizationActions({ examId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Authorize confirmation
  const [showAuthorizeConfirm, setShowAuthorizeConfirm] = useState(false);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleAuthorize() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await authorizeExamAction({ examId });
      if (result.success) {
        setSuccess("Examen autorizado correctamente.");
        setShowAuthorizeConfirm(false);
        router.refresh();
      } else {
        setError(result.error);
        setShowAuthorizeConfirm(false);
      }
    });
  }

  function handleReject() {
    if (!rejectionReason.trim()) {
      setError("El motivo de rechazo es obligatorio.");
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await rejectExamAction({ examId, rejectionReason });
      if (result.success) {
        setSuccess("Examen rechazado.");
        setShowRejectModal(false);
        setRejectionReason("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Feedback */}
      {error && (
        <div className="bg-rose-900/30 border border-rose-700 text-rose-300 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-900/30 border border-emerald-700 text-emerald-300 text-sm px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Action buttons */}
      {!showAuthorizeConfirm && !showRejectModal && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAuthorizeConfirm(true)}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Autorizar
          </button>
          <button
            onClick={() => {
              setError(null);
              setShowRejectModal(true);
            }}
            disabled={isPending}
            className="bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Rechazar
          </button>
        </div>
      )}

      {/* Authorize confirmation */}
      {showAuthorizeConfirm && (
        <div className="bg-neutral-800 border border-emerald-700/50 rounded-xl p-5 space-y-4">
          <p className="text-sm text-neutral-200">
            ¿Confirmas que deseas{" "}
            <span className="text-emerald-400 font-medium">autorizar</span> este
            examen? Se actualizará el grado del alumno.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAuthorize}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {isPending ? "Procesando…" : "Confirmar autorización"}
            </button>
            <button
              onClick={() => setShowAuthorizeConfirm(false)}
              disabled={isPending}
              className="text-neutral-400 hover:text-neutral-200 text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="bg-neutral-800 border border-rose-700/50 rounded-xl p-5 space-y-4">
          <p className="text-sm text-neutral-200">
            Indica el motivo del{" "}
            <span className="text-rose-400 font-medium">rechazo</span>. Este
            campo es obligatorio.
          </p>
          <div className="space-y-2">
            <label
              htmlFor="rejectionReason"
              className="block text-xs font-medium text-neutral-400 uppercase tracking-wider"
            >
              Motivo de rechazo
            </label>
            <textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="Describe el motivo del rechazo…"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-rose-600 resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReject}
              disabled={isPending || !rejectionReason.trim()}
              className="bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {isPending ? "Procesando…" : "Confirmar rechazo"}
            </button>
            <button
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason("");
                setError(null);
              }}
              disabled={isPending}
              className="text-neutral-400 hover:text-neutral-200 text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

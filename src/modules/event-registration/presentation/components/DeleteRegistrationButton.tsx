"use client";

import { useState, useTransition } from "react";
import { deleteRegistrationAction } from "../actions/deleteRegistrationAction";

interface Props {
  registrationId: string;
  eventId: string;
  studentName: string;
  onSuccess?: () => void;
}

export function DeleteRegistrationButton({
  registrationId,
  eventId,
  studentName,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteRegistrationAction({
        registrationId,
        eventId,
      });

      if (result.success) {
        setShowConfirm(false);
        // Success toast (using your existing toast system)
        // toast.success("Inscripción eliminada correctamente");
        onSuccess?.();
      } else {
        // Error toast
        // toast.error(result.error);
        console.error(
          `[DeleteRegistrationButton] ${result.code}:`,
          result.error,
        );
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-error-400 bg-error-500/10 border border-error-500/30 rounded-lg hover:bg-error-500/20 hover:border-error-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label={`Eliminar inscripción de ${studentName}`}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Eliminar
      </button>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-error-500/20 rounded-full border border-error-500/30">
                <svg
                  className="w-6 h-6 text-error-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-100 mb-2">
                  ¿Eliminar inscripción?
                </h3>
                <p className="text-sm text-neutral-400">
                  Estás a punto de eliminar la inscripción de{" "}
                  <span className="font-semibold text-neutral-200">
                    {studentName}
                  </span>
                  . Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-300 bg-neutral-800 border border-neutral-700 rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-error-600 border border-error-600 rounded-lg hover:bg-error-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

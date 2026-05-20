"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  confirmPaymentAction,
  cancelRegistrationAction,
  updateNotesAction,
} from "@/modules/event-registration/presentation/actions/registrationActions";
import type { RegistrationRow } from "./RegistrationsGrouped";

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

export function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// RegistrationRowActions
// ---------------------------------------------------------------------------

export function RegistrationRowActions({
  reg,
  eventId,
}: {
  reg: RegistrationRow;
  eventId: string;
}) {
  const router = useRouter();
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(reg.notes ?? "");
  const [confirmPending, startConfirm] = useTransition();
  const [cancelPending, startCancel] = useTransition();
  const [notePending, startNote] = useTransition();
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  const isAnyPending = confirmPending || cancelPending || notePending;
  const canConfirm = reg.status === "pendiente_pago";
  const canCancel = reg.status !== "cancelada";

  function handleConfirm() {
    setConfirmError(null);
    startConfirm(async () => {
      const result = await confirmPaymentAction({
        registrationId: reg.id,
        eventId,
      });
      if (result.success) {
        router.refresh();
      } else {
        setConfirmError(result.error);
      }
    });
  }

  function handleCancel() {
    if (
      !confirm(
        `¿Cancelar la inscripción de ${reg.practitionerName}? Esta acción no se puede deshacer fácilmente.`,
      )
    )
      return;
    setCancelError(null);
    startCancel(async () => {
      const result = await cancelRegistrationAction({
        registrationId: reg.id,
        eventId,
      });
      if (result.success) {
        router.refresh();
      } else {
        setCancelError(result.error);
      }
    });
  }

  function handleSaveNote() {
    setNoteError(null);
    startNote(async () => {
      const result = await updateNotesAction({
        registrationId: reg.id,
        eventId,
        notes: noteText.trim(),
      });
      if (result.success) {
        setShowNote(false);
        router.refresh();
      } else {
        setNoteError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {canConfirm && (
          <button
            onClick={handleConfirm}
            disabled={isAnyPending}
            title="Confirmar inscripción"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-900/40 hover:bg-emerald-900/70 text-emerald-400 border border-emerald-800/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {confirmPending ? (
              <Spinner />
            ) : (
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            Confirmar
          </button>
        )}

        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={isAnyPending}
            title="Rechazar inscripción"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-red-900/30 text-neutral-500 hover:text-red-400 border border-neutral-700 hover:border-red-800/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {cancelPending ? (
              <Spinner />
            ) : (
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            Rechazar
          </button>
        )}

        <button
          onClick={() => setShowNote((v) => !v)}
          disabled={isAnyPending}
          title={reg.notes ? "Ver/editar observación" : "Agregar observación"}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            reg.notes || showNote
              ? "bg-amber-900/40 hover:bg-amber-900/70 text-amber-400 border border-amber-800/60"
              : "bg-neutral-800 hover:bg-neutral-700/80 text-neutral-500 hover:text-neutral-300 border border-neutral-700"
          }`}
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
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
          {reg.notes ? "Obs." : "Observar"}
        </button>
      </div>

      {confirmError && <p className="text-xs text-red-400">{confirmError}</p>}
      {cancelError && <p className="text-xs text-red-400">{cancelError}</p>}

      {showNote && (
        <div className="space-y-1.5 pt-0.5">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Escribe una observación..."
            rows={2}
            maxLength={500}
            className="w-full px-2.5 py-2 bg-neutral-800/80 border border-neutral-700 focus:border-amber-700 rounded-lg text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-500/40 resize-none transition-colors"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveNote}
              disabled={notePending}
              className="px-2.5 py-1 bg-amber-900/50 hover:bg-amber-900/80 text-amber-400 border border-amber-800/60 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
            >
              {notePending ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={() => {
                setShowNote(false);
                setNoteText(reg.notes ?? "");
              }}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Cancelar
            </button>
            <span className="ml-auto text-xs text-neutral-600">
              {noteText.length}/500
            </span>
          </div>
          {noteError && <p className="text-xs text-red-400">{noteError}</p>}
        </div>
      )}
    </div>
  );
}

"use client";

import { useTransition, useState } from "react";
import { approveInstructorAccountRequestAction } from "../actions/instructorAccountRequestActions";

interface Props {
  requestId: string;
}

export function ApproveInstructorRequestButton({ requestId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveInstructorAccountRequestAction({ requestId });
      if (!result.success) {
        setError(result.error);
      } else {
        setTemporaryPassword(result.data.temporaryPassword);
      }
    });
  }

  async function handleCopy() {
    if (!temporaryPassword) return;
    await navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // After approval — show the temporary password to the admin.
  // revalidatePath is NOT called in the action so this state persists.
  // The admin refreshes manually after copying the password.
  if (temporaryPassword) {
    return (
      <div className="flex flex-col gap-1.5 min-w-[220px]">
        <p className="text-xs text-emerald-400 font-medium">✓ Cuenta creada</p>
        <p className="text-xs text-neutral-400 leading-snug">
          Contraseña temporal — compártela con el instructor:
        </p>
        <div className="flex items-center gap-1.5">
          <code className="flex-1 bg-neutral-800 border border-neutral-600 rounded-lg px-2 py-1.5 text-xs text-neutral-100 font-mono tracking-wide select-all">
            {temporaryPassword}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 px-2 py-1.5 rounded-lg text-xs transition-colors"
            title="Copiar contraseña"
          >
            {copied ? "✓" : "Copiar"}
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          El instructor debe cambiarla al iniciar sesión.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-1 text-xs text-neutral-500 hover:text-neutral-300 underline underline-offset-2 text-left transition-colors"
        >
          Ya copié la contraseña — actualizar lista →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleApprove}
        disabled={isPending}
        className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Aprobando..." : "Aprobar"}
      </button>
      {error && (
        <p className="text-xs text-red-400 max-w-[160px] text-right">{error}</p>
      )}
    </div>
  );
}

"use client";

import { useTransition, useState } from "react";
import { approveRefereeRegistrationAction } from "../actions/adminRefereeActions";

interface Props {
  id: string;
}

export function ApproveRegistrationButton({ id }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveRefereeRegistrationAction({ id });
      if (!result.success) {
        setError(result.error);
      }
    });
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
        <p className="text-xs text-error-400 max-w-[160px] text-right">
          {error}
        </p>
      )}
    </div>
  );
}

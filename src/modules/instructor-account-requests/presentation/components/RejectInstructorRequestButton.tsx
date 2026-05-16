"use client";

import { useTransition, useState } from "react";
import { rejectInstructorAccountRequestAction } from "../actions/instructorAccountRequestActions";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  requestId: string;
}

// ---------------------------------------------------------------------------
// Component
// Validates: Requirement 5.1
// ---------------------------------------------------------------------------

export function RejectInstructorRequestButton({ requestId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleReject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectInstructorAccountRequestAction({ requestId });
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleReject}
        disabled={isPending}
        className="bg-red-900/60 hover:bg-red-800 text-red-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Rechazando..." : "Rechazar"}
      </button>
      {error && (
        <p className="text-xs text-error-400 max-w-[160px] text-right">
          {error}
        </p>
      )}
    </div>
  );
}

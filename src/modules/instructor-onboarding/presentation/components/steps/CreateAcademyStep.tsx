"use client";

import { useState, useTransition } from "react";
import { AcademyBasicDataForm } from "../forms/AcademyBasicDataForm";
import { AcademyPublicProfileForm } from "../forms/AcademyPublicProfileForm";
import {
  createAcademyAndCompleteStepAction,
  selectExistingAcademyAndCompleteStepAction,
} from "../../actions/onboardingActions";
import type { AcademyBasicData } from "../forms/AcademyBasicDataForm";
import type { AcademyPublicProfile } from "../forms/AcademyPublicProfileForm";
import type { AcademyOption } from "../types";

interface CreateAcademyStepProps {
  instructorAcademies: AcademyOption[];
  onComplete: () => void;
}

export function CreateAcademyStep({
  instructorAcademies,
  onComplete,
}: CreateAcademyStepProps) {
  const [phase, setPhase] = useState<"basic" | "profile">("basic");
  const [basicData, setBasicData] = useState<AcademyBasicData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleBasicSubmit(data: AcademyBasicData) {
    setBasicData(data);
    setPhase("profile");
  }

  function handleProfileSubmit(profileData: AcademyPublicProfile) {
    if (!basicData) return;
    setError(null);
    startTransition(async () => {
      const result = await createAcademyAndCompleteStepAction(
        basicData,
        profileData,
      );
      if (result.success) {
        onComplete();
      } else {
        setError(result.error);
      }
    });
  }

  function handleSelectExisting(academyId: string) {
    setError(null);
    startTransition(async () => {
      const result = await selectExistingAcademyAndCompleteStepAction({
        academyId,
      });
      if (result.success) {
        onComplete();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Existing academies */}
      {instructorAcademies.length > 0 && (
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
            O selecciona una academia existente
          </p>
          <div className="space-y-2">
            {instructorAcademies.map((academy) => (
              <button
                key={academy.id}
                type="button"
                disabled={isPending}
                onClick={() => handleSelectExisting(academy.id)}
                className="w-full text-left px-4 py-2.5 bg-neutral-700/50 hover:bg-neutral-700 disabled:opacity-50 rounded-xl text-sm text-neutral-200 transition-colors"
              >
                {academy.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      {phase === "basic" && (
        <AcademyBasicDataForm
          onSubmit={handleBasicSubmit}
          isSubmitting={isPending}
        />
      )}

      {phase === "profile" && (
        <AcademyPublicProfileForm
          onSubmit={handleProfileSubmit}
          isSubmitting={isPending}
          onBack={() => setPhase("basic")}
        />
      )}
    </div>
  );
}

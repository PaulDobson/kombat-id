"use client";

interface OnboardingStepIndicatorProps {
  currentStep: number; // 0-indexed
}

export function OnboardingStepIndicator({
  currentStep,
}: OnboardingStepIndicatorProps) {
  return (
    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
      Paso {currentStep + 1} de 4
    </p>
  );
}

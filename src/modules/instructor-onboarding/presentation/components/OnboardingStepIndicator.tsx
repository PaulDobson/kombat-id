"use client";

import { Check } from "lucide-react";

const STEP_LABELS = [
  "Crear academia",
  "Registrar alumnos",
  "Bienvenida",
  "Eventos",
] as const;

interface OnboardingStepIndicatorProps {
  currentStep: number; // 0-indexed — the active step
  completedSteps: boolean[]; // length 4, one per step
}

export function OnboardingStepIndicator({
  currentStep,
  completedSteps,
}: OnboardingStepIndicatorProps) {
  return (
    <nav aria-label="Pasos de configuración" className="w-full">
      <ol className="flex items-center w-full">
        {STEP_LABELS.map((label, index) => {
          const isCompleted = completedSteps[index];
          const isActive = index === currentStep;
          const isLast = index === STEP_LABELS.length - 1;

          return (
            <li
              key={index}
              className={`flex items-center ${isLast ? "flex-none" : "flex-1"}`}
            >
              {/* Step node */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    transition-all duration-200 border-2
                    ${
                      isCompleted
                        ? "bg-primary-500 border-primary-500 text-neutral-900"
                        : isActive
                          ? "bg-transparent border-primary-500 text-primary-400"
                          : "bg-transparent border-neutral-700 text-neutral-600"
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap hidden sm:block
                    ${
                      isCompleted
                        ? "text-primary-400"
                        : isActive
                          ? "text-neutral-200"
                          : "text-neutral-600"
                    }
                  `}
                >
                  {label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={`
                    flex-1 h-px mx-2 mb-5 sm:mb-[1.125rem] transition-all duration-300
                    ${isCompleted ? "bg-primary-500" : "bg-neutral-700"}
                  `}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

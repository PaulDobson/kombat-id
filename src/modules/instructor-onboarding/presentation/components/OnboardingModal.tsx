"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Check } from "lucide-react";
import { CreateAcademyStep } from "./steps/CreateAcademyStep";
import { RegisterStudentsStep } from "./steps/RegisterStudentsStep";
import { EventsInfoStep } from "./steps/EventsInfoStep";
import type { OnboardingProgressDTO, AcademyOption } from "./types";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  initialStep: number;
  progressDTO: OnboardingProgressDTO;
  instructorAcademies: AcademyOption[];
}

const STEPS = [
  { label: "Academia", subtitle: "Ingresa los datos de tu academia." },
  { label: "Alumnos", subtitle: "Agrega tus alumnos uno a uno." },
  { label: "Eventos", subtitle: "Conoce el calendario de competencias." },
] as const;

export function OnboardingModal({
  open,
  onClose,
  initialStep,
  progressDTO,
  instructorAcademies,
}: OnboardingModalProps) {
  const initialCompleted = [
    progressDTO.stepCreateAcademyCompleted,
    progressDTO.stepRegisterStudentsCompleted,
    progressDTO.stepEventsInfoCompleted,
  ];

  const [activeStep, setActiveStep] = useState(initialStep);
  const [localCompleted, setLocalCompleted] =
    useState<boolean[]>(initialCompleted);

  const completedCount = localCompleted.filter(Boolean).length;
  const allDone = completedCount === STEPS.length;

  function completeAndAdvance(stepIndex: number): void {
    setLocalCompleted((prev) => {
      const next = [...prev];
      next[stepIndex] = true;
      return next;
    });
    if (stepIndex < STEPS.length - 1) {
      setActiveStep(stepIndex + 1);
    } else {
      // last step done — brief delay then close
      setTimeout(onClose, 800);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 animate-in fade-in duration-200" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onEscapeKeyDown={onClose}
          aria-describedby={undefined}
        >
          <div className="relative bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-xl shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="px-6 pt-5 pb-4 border-b border-neutral-800 shrink-0">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-semibold text-primary-400 uppercase tracking-widest mb-0.5">
                    Configuración inicial
                  </p>
                  <Dialog.Title className="text-base font-bold text-neutral-50">
                    {allDone
                      ? "¡Todo listo!"
                      : (STEPS[activeStep]?.label ?? "")}
                  </Dialog.Title>
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                    aria-label="Cerrar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Step indicator */}
              <StepBar
                steps={STEPS.map((s) => s.label)}
                activeStep={activeStep}
                completedSteps={localCompleted}
                onStepClick={setActiveStep}
              />
            </div>

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className="px-6 py-5 overflow-y-auto flex-1">
              {/* Subtitle */}
              <p className="text-xs text-neutral-500 mb-5">
                {STEPS[activeStep]?.subtitle}
              </p>

              {activeStep === 0 && (
                <CreateAcademyStep
                  instructorAcademies={instructorAcademies}
                  onComplete={() => completeAndAdvance(0)}
                />
              )}
              {activeStep === 1 && (
                <RegisterStudentsStep
                  academyId={instructorAcademies[0]?.id ?? ""}
                  onComplete={() => completeAndAdvance(1)}
                  onSkip={() => setActiveStep(2)}
                />
              )}
              {activeStep === 2 && (
                <EventsInfoStep onComplete={() => completeAndAdvance(2)} />
              )}
            </div>

            {/* ── Footer progress ─────────────────────────────────────────── */}
            <div className="px-6 py-3 border-t border-neutral-800 shrink-0 flex items-center gap-3">
              <div className="flex-1 bg-neutral-800 rounded-full h-1">
                <div
                  className="h-1 rounded-full bg-primary-500 transition-all duration-500"
                  style={{ width: `${(completedCount / STEPS.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-neutral-600 tabular-nums whitespace-nowrap">
                {completedCount}/{STEPS.length} completados
              </span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Internal StepBar
// ---------------------------------------------------------------------------

interface StepBarProps {
  steps: readonly string[];
  activeStep: number;
  completedSteps: boolean[];
  onStepClick: (index: number) => void;
}

function StepBar({
  steps,
  activeStep,
  completedSteps,
  onStepClick,
}: StepBarProps) {
  return (
    <nav aria-label="Pasos">
      <ol className="flex items-center">
        {steps.map((label, i) => {
          const done = completedSteps[i];
          const active = i === activeStep;
          const isLast = i === steps.length - 1;

          return (
            <li
              key={i}
              className={`flex items-center ${isLast ? "" : "flex-1"}`}
            >
              <button
                type="button"
                onClick={() => onStepClick(i)}
                className="flex flex-col items-center gap-1.5 group"
                aria-current={active ? "step" : undefined}
                aria-label={`Paso ${i + 1}: ${label}`}
              >
                {/* Circle */}
                <div
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    border-2 transition-all duration-200
                    ${
                      done
                        ? "bg-primary-500 border-primary-500 text-neutral-900"
                        : active
                          ? "bg-neutral-900 border-primary-500 text-primary-400 ring-4 ring-primary-500/15"
                          : "bg-neutral-900 border-neutral-700 text-neutral-600 group-hover:border-neutral-500"
                    }
                  `}
                >
                  {done ? <Check className="w-3 h-3 stroke-[3]" /> : i + 1}
                </div>
                {/* Label */}
                <span
                  className={`text-[10px] font-medium transition-colors hidden sm:block
                    ${done ? "text-primary-400" : active ? "text-neutral-200" : "text-neutral-600"}
                  `}
                >
                  {label}
                </span>
              </button>

              {/* Connector */}
              {!isLast && (
                <div
                  className={`flex-1 h-px mx-2 mb-[1.125rem] transition-colors duration-300
                    ${done ? "bg-primary-500/60" : "bg-neutral-700/60"}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

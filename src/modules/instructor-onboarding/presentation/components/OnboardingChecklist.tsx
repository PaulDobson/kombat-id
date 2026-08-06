"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import type { OnboardingProgressDTO, AcademyOption } from "./types";
import { OnboardingModal } from "./OnboardingModal";

function getFirstIncompleteStepFromDTO(dto: OnboardingProgressDTO): number {
  const flags = [
    dto.stepCreateAcademyCompleted,
    dto.stepRegisterStudentsCompleted,
    dto.stepWelcomeEmailsCompleted,
    dto.stepEventsInfoCompleted,
  ];
  const idx = flags.findIndex((f) => !f);
  return idx === -1 ? 0 : idx;
}

function completedStepCountFromDTO(dto: OnboardingProgressDTO): number {
  return [
    dto.stepCreateAcademyCompleted,
    dto.stepRegisterStudentsCompleted,
    dto.stepWelcomeEmailsCompleted,
    dto.stepEventsInfoCompleted,
  ].filter(Boolean).length;
}

const STEP_NAMES = [
  "Crear academia",
  "Registrar alumnos",
  "Enviar bienvenida",
  "Revisar eventos",
];

interface OnboardingChecklistProps {
  progressDTO: OnboardingProgressDTO;
  initialOpen?: boolean;
  instructorAcademies: AcademyOption[];
}

export function OnboardingChecklist({
  progressDTO,
  initialOpen,
  instructorAcademies,
}: OnboardingChecklistProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (initialOpen) {
      setActiveStep(getFirstIncompleteStepFromDTO(progressDTO));
      setModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  const completed = completedStepCountFromDTO(progressDTO);
  const stepFlags = [
    progressDTO.stepCreateAcademyCompleted,
    progressDTO.stepRegisterStudentsCompleted,
    progressDTO.stepWelcomeEmailsCompleted,
    progressDTO.stepEventsInfoCompleted,
  ];

  function openModalAtStep(index: number): void {
    setActiveStep(index);
    setModalOpen(true);
  }

  return (
    <>
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5">
        <p className="text-xs font-semibold text-primary-400 uppercase tracking-widest mb-1">
          Configuración inicial
        </p>
        <h2 className="text-base font-bold text-neutral-50 mb-4">
          {completed}/4 pasos completados
        </h2>
        <ul className="space-y-2">
          {STEP_NAMES.map((name, index) => {
            const isCompleted = stepFlags[index];
            return (
              <li key={index}>
                <button
                  type="button"
                  onClick={() =>
                    isCompleted
                      ? openModalAtStep(
                          getFirstIncompleteStepFromDTO(progressDTO),
                        )
                      : openModalAtStep(index)
                  }
                  className="flex items-center gap-3 w-full text-left py-2 px-3 rounded-xl hover:bg-neutral-800 transition-colors"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-neutral-500 shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      isCompleted
                        ? "text-neutral-400 line-through"
                        : "text-neutral-200"
                    }`}
                  >
                    {name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {modalOpen && (
        <OnboardingModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          initialStep={activeStep}
          progressDTO={progressDTO}
          instructorAcademies={instructorAcademies}
        />
      )}
    </>
  );
}

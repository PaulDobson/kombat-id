"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { OnboardingStepIndicator } from "./OnboardingStepIndicator";
import { CreateAcademyStep } from "./steps/CreateAcademyStep";
import { RegisterStudentsStep } from "./steps/RegisterStudentsStep";
import { WelcomeEmailsStep } from "./steps/WelcomeEmailsStep";
import { EventsInfoStep } from "./steps/EventsInfoStep";
import type {
  OnboardingProgressDTO,
  AcademyOption,
  SessionStudent,
} from "./types";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  initialStep: number; // 0-indexed
  progressDTO: OnboardingProgressDTO;
  instructorAcademies: AcademyOption[];
}

const STEP_TITLES = [
  "Crear academia",
  "Registrar alumnos",
  "Correos de bienvenida",
  "Revisar eventos",
] as const;

export function OnboardingModal({
  open,
  onClose,
  initialStep,
  progressDTO: _progressDTO, // accepted for future use; not consumed in modal body
  instructorAcademies,
}: OnboardingModalProps) {
  const [activeStep, setActiveStep] = useState(initialStep);
  const [sessionStudents, setSessionStudents] = useState<SessionStudent[]>([]);

  function advanceStep(): void {
    if (activeStep >= 3) {
      onClose();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onEscapeKeyDown={onClose}
        >
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-neutral-800">
              <div>
                <OnboardingStepIndicator currentStep={activeStep} />
                <p className="text-xs text-neutral-500 mt-1">
                  {STEP_TITLES[activeStep]}
                </p>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              {activeStep === 0 && (
                <CreateAcademyStep
                  instructorAcademies={instructorAcademies}
                  onComplete={advanceStep}
                />
              )}
              {activeStep === 1 && (
                <RegisterStudentsStep
                  academyId={instructorAcademies[0]?.id ?? ""}
                  onComplete={(students) => {
                    setSessionStudents(students);
                    advanceStep();
                  }}
                />
              )}
              {activeStep === 2 && (
                <WelcomeEmailsStep
                  students={sessionStudents}
                  onComplete={advanceStep}
                />
              )}
              {activeStep === 3 && <EventsInfoStep onComplete={advanceStep} />}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

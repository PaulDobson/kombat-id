"use client";

import { useState, useEffect } from "react";
import { Rocket } from "lucide-react";
import type { OnboardingProgressDTO, AcademyOption } from "./types";
import { OnboardingModal } from "./OnboardingModal";

function getFirstIncompleteStep(dto: OnboardingProgressDTO): number {
  const flags = [
    dto.stepCreateAcademyCompleted,
    dto.stepRegisterStudentsCompleted,
    dto.stepEventsInfoCompleted,
  ];
  const idx = flags.findIndex((f) => !f);
  return idx === -1 ? 0 : idx;
}

function completedCount(dto: OnboardingProgressDTO): number {
  return [
    dto.stepCreateAcademyCompleted,
    dto.stepRegisterStudentsCompleted,
    dto.stepEventsInfoCompleted,
  ].filter(Boolean).length;
}

const TOTAL = 3;

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
  const [activeStep, setActiveStep] = useState(
    getFirstIncompleteStep(progressDTO),
  );

  // Auto-open on first visit (all steps pending)
  useEffect(() => {
    if (initialOpen) {
      setActiveStep(getFirstIncompleteStep(progressDTO));
      setModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = completedCount(progressDTO);
  const pct = Math.round((done / TOTAL) * 100);

  function openAtStep(step: number): void {
    setActiveStep(step);
    setModalOpen(true);
  }

  return (
    <>
      {/* ── Compact trigger banner ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => openAtStep(getFirstIncompleteStep(progressDTO))}
        className="group w-full text-left bg-neutral-900 border border-neutral-700 hover:border-primary-500/50 rounded-2xl px-5 py-4 transition-all duration-200 hover:bg-neutral-800/60"
        aria-label="Abrir configuración inicial"
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0 group-hover:bg-primary-500/20 transition-colors">
            <Rocket
              className="w-4.5 h-4.5 text-primary-400"
              strokeWidth={1.75}
            />
          </div>

          {/* Text + bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-sm font-semibold text-neutral-100 truncate">
                Configuración inicial
              </p>
              <span className="shrink-0 text-xs font-medium text-neutral-500">
                {done}/{TOTAL}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-neutral-800 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-500 bg-primary-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* CTA */}
          <span className="shrink-0 text-xs font-semibold text-primary-400 group-hover:text-primary-300 transition-colors whitespace-nowrap">
            {done === 0 ? "Empezar →" : done < TOTAL ? "Continuar →" : "Ver →"}
          </span>
        </div>
      </button>

      {/* ── Wizard modal ────────────────────────────────────────────────── */}
      <OnboardingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialStep={activeStep}
        progressDTO={progressDTO}
        instructorAcademies={instructorAcademies}
      />
    </>
  );
}

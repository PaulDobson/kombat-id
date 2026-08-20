// step_welcome_emails_completed is intentionally omitted from the active step
// keys — the column is retained in the DB for backwards compatibility but the
// step has been deprecated and is pre-set to true for all records (migration 047).

export type OnboardingStepKey =
  | "step_create_academy_completed"
  | "step_register_students_completed"
  | "step_events_info_completed";

export const ONBOARDING_STEP_KEYS: OnboardingStepKey[] = [
  "step_create_academy_completed",
  "step_register_students_completed",
  "step_events_info_completed",
] as const;

export interface OnboardingProgress {
  id: string;
  practitionerId: string;
  stepCreateAcademyCompleted: boolean;
  stepRegisterStudentsCompleted: boolean;
  stepEventsInfoCompleted: boolean;
  completedAt: string | null; // ISO timestamp
  createdAt: string;
  updatedAt: string;
}

/** Returns the index of the first incomplete step (0–2), or -1 if all are complete. */
export function getFirstIncompleteStepIndex(p: OnboardingProgress): number {
  const flags = [
    p.stepCreateAcademyCompleted,
    p.stepRegisterStudentsCompleted,
    p.stepEventsInfoCompleted,
  ];
  return flags.findIndex((f) => !f);
}

/** Returns true when all three active steps are complete. */
export function isOnboardingComplete(p: OnboardingProgress): boolean {
  return (
    p.stepCreateAcademyCompleted &&
    p.stepRegisterStudentsCompleted &&
    p.stepEventsInfoCompleted
  );
}

/** Returns the count of completed active steps (0–3). */
export function completedStepCount(p: OnboardingProgress): number {
  return [
    p.stepCreateAcademyCompleted,
    p.stepRegisterStudentsCompleted,
    p.stepEventsInfoCompleted,
  ].filter(Boolean).length;
}

/**
 * @deprecated This step has been removed from the onboarding flow (migration 047).
 * The welcome-emails step is no longer part of the active 3-step onboarding wizard.
 * This file is retained only to avoid compile errors from any lingering imports.
 * It is safe to delete once all references have been confirmed clean.
 */
"use client";

import type { SessionStudent } from "../types";

interface WelcomeEmailsStepProps {
  students: SessionStudent[];
  onComplete: () => void;
}

/** @deprecated — no longer rendered. Returns null. */
export function WelcomeEmailsStep(_props: WelcomeEmailsStepProps) {
  return null;
}

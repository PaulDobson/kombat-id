import type { OnboardingProgress } from "../../domain/entities/onboardingProgress";
import type { OnboardingProgressRepository } from "../../domain/interfaces/onboardingProgressRepository";
import { markStepComplete } from "./markStepComplete";

/**
 * Completes the final onboarding step (EventsInfo) for a practitioner.
 * Delegates to markStepComplete with step_events_info_completed, which
 * will also set completedAt since this is the last step.
 *
 * Requirements: 6.3
 */
export async function completeOnboarding(
  practitionerId: string,
  deps: { repo: OnboardingProgressRepository },
): Promise<OnboardingProgress> {
  return markStepComplete(
    {
      practitionerId,
      step: "step_events_info_completed",
    },
    deps,
  );
}

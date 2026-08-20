import { z } from "zod";
import type { OnboardingProgress } from "../../domain/entities/onboardingProgress";
import { isOnboardingComplete } from "../../domain/entities/onboardingProgress";
import type { OnboardingProgressRepository } from "../../domain/interfaces/onboardingProgressRepository";

/**
 * Input schema for markStepComplete.
 * Comes from the application boundary so validation is enforced with parse().
 *
 * Requirements: 1.3, 1.4
 */
export const MarkStepCompleteInput = z.object({
  practitionerId: z.string().uuid(),
  step: z.enum([
    "step_create_academy_completed",
    "step_register_students_completed",
    "step_events_info_completed",
  ]),
});

export type MarkStepCompleteInput = z.infer<typeof MarkStepCompleteInput>;

/**
 * Marks a single onboarding step as complete.
 * If all four steps become complete after this call, also sets completedAt
 * on the record via repo.markAllComplete.
 *
 * Requirements: 1.3, 1.4
 */
export async function markStepComplete(
  input: MarkStepCompleteInput,
  deps: { repo: OnboardingProgressRepository },
): Promise<OnboardingProgress> {
  const validated = MarkStepCompleteInput.parse(input);

  const updated = await deps.repo.markStepComplete(
    validated.practitionerId,
    validated.step,
  );

  if (isOnboardingComplete(updated)) {
    return deps.repo.markAllComplete(
      validated.practitionerId,
      new Date().toISOString(),
    );
  }

  return updated;
}

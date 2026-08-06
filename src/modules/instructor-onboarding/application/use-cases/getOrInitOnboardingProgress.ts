import type { OnboardingProgress } from "../../domain/entities/onboardingProgress";
import type { OnboardingProgressRepository } from "../../domain/interfaces/onboardingProgressRepository";

/**
 * Fetches the onboarding progress record for a practitioner.
 * If no record exists, creates one with all steps false and returns it.
 *
 * Requirements: 1.5
 */
export async function getOrInitOnboardingProgress(
  practitionerId: string,
  deps: { repo: OnboardingProgressRepository },
): Promise<OnboardingProgress> {
  const existing = await deps.repo.findByPractitionerId(practitionerId);

  if (existing !== null) {
    return existing;
  }

  return deps.repo.create(practitionerId);
}

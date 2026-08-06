import type {
  OnboardingProgress,
  OnboardingStepKey,
} from "../entities/onboardingProgress";

export interface OnboardingProgressRepository {
  findByPractitionerId(
    practitionerId: string,
  ): Promise<OnboardingProgress | null>;
  create(practitionerId: string): Promise<OnboardingProgress>;
  markStepComplete(
    practitionerId: string,
    step: OnboardingStepKey,
  ): Promise<OnboardingProgress>;
  markAllComplete(
    practitionerId: string,
    completedAt: string,
  ): Promise<OnboardingProgress>;
}

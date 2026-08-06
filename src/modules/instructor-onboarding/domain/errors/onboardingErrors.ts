import { DomainError } from "@/lib/errors";

export class OnboardingProgressNotFoundError extends DomainError {
  constructor(practitionerId: string) {
    super(`Onboarding progress not found for practitioner ${practitionerId}`);
  }
}

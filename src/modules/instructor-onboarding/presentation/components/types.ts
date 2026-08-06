// Serialisable shape passed from Server Component to Client Components
export interface OnboardingProgressDTO {
  stepCreateAcademyCompleted: boolean;
  stepRegisterStudentsCompleted: boolean;
  stepWelcomeEmailsCompleted: boolean;
  stepEventsInfoCompleted: boolean;
  completedAt: string | null;
}

// Session-level student record — held in React state, passed between steps
export interface SessionStudent {
  practitionerId: string;
  fullName: string;
  email: string;
  temporaryPassword: string;
}

// Academy option for the CreateAcademyStep "select existing" affordance
export interface AcademyOption {
  id: string;
  name: string;
}

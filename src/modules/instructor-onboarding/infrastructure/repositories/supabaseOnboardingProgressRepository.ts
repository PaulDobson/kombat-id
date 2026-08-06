import "server-only";

import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type {
  OnboardingProgress,
  OnboardingStepKey,
} from "../../domain/entities/onboardingProgress";
import type { OnboardingProgressRepository } from "../../domain/interfaces/onboardingProgressRepository";

// ---------------------------------------------------------------------------
// Row schema — validates the raw shape returned by Supabase at runtime
// ---------------------------------------------------------------------------

const OnboardingProgressRowSchema = z.object({
  id: z.string().uuid(),
  practitioner_id: z.string().uuid(),
  step_create_academy_completed: z.boolean(),
  step_register_students_completed: z.boolean(),
  step_welcome_emails_completed: z.boolean(),
  step_events_info_completed: z.boolean(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

type OnboardingProgressRow = z.infer<typeof OnboardingProgressRowSchema>;

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function toEntity(row: OnboardingProgressRow): OnboardingProgress {
  return {
    id: row.id,
    practitionerId: row.practitioner_id,
    stepCreateAcademyCompleted: row.step_create_academy_completed,
    stepRegisterStudentsCompleted: row.step_register_students_completed,
    stepWelcomeEmailsCompleted: row.step_welcome_emails_completed,
    stepEventsInfoCompleted: row.step_events_info_completed,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseRow(raw: unknown): OnboardingProgress {
  const result = OnboardingProgressRowSchema.safeParse(raw);
  if (!result.success) {
    throw new DomainError(
      `Onboarding progress row failed schema validation: ${result.error.message}`,
    );
  }
  return toEntity(result.data);
}

// Map a domain OnboardingStepKey (snake_case DB column name) to the column
// used in update queries. The step key is already the exact column name.
function stepKeyToColumn(step: OnboardingStepKey): string {
  return step;
}

// ---------------------------------------------------------------------------
// Repository implementation
// ---------------------------------------------------------------------------

export class SupabaseOnboardingProgressRepository implements OnboardingProgressRepository {
  async findByPractitionerId(
    practitionerId: string,
  ): Promise<OnboardingProgress | null> {
    const { data, error } = await adminSupabase
      // The table is not yet in the generated Database type (new migration),
      // so we cast the table name to bypass the type checker.
      .from("instructor_onboarding_progress" as never)
      .select("*")
      .eq("practitioner_id", practitionerId)
      .maybeSingle();

    if (error) {
      throw new DomainError(
        `Failed to find onboarding progress for practitioner ${practitionerId}: ${error.message}`,
      );
    }

    if (!data) return null;

    return parseRow(data);
  }

  async create(practitionerId: string): Promise<OnboardingProgress> {
    const { data, error } = await adminSupabase
      .from("instructor_onboarding_progress" as never)
      .insert({
        practitioner_id: practitionerId,
        step_create_academy_completed: false,
        step_register_students_completed: false,
        step_welcome_emails_completed: false,
        step_events_info_completed: false,
        completed_at: null,
      } as never)
      .select("*")
      .single();

    if (error) {
      throw new DomainError(
        `Failed to create onboarding progress for practitioner ${practitionerId}: ${error.message}`,
      );
    }

    return parseRow(data);
  }

  async markStepComplete(
    practitionerId: string,
    step: OnboardingStepKey,
  ): Promise<OnboardingProgress> {
    const column = stepKeyToColumn(step);

    const { data, error } = await adminSupabase
      .from("instructor_onboarding_progress" as never)
      .update({
        [column]: true,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("practitioner_id", practitionerId)
      .select("*")
      .single();

    if (error) {
      throw new DomainError(
        `Failed to mark step ${step} complete for practitioner ${practitionerId}: ${error.message}`,
      );
    }

    return parseRow(data);
  }

  async markAllComplete(
    practitionerId: string,
    completedAt: string,
  ): Promise<OnboardingProgress> {
    const { data, error } = await adminSupabase
      .from("instructor_onboarding_progress" as never)
      .update({
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("practitioner_id", practitionerId)
      .select("*")
      .single();

    if (error) {
      throw new DomainError(
        `Failed to mark onboarding complete for practitioner ${practitionerId}: ${error.message}`,
      );
    }

    return parseRow(data);
  }
}

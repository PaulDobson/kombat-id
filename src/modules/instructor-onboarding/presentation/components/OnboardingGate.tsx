import { SupabaseOnboardingProgressRepository } from "../../infrastructure/repositories/supabaseOnboardingProgressRepository";
import { getOrInitOnboardingProgress } from "../../application/use-cases/getOrInitOnboardingProgress";
import { adminSupabase } from "@/lib/supabase/admin";
import { OnboardingChecklist } from "./OnboardingChecklist";
import type { OnboardingProgressDTO, AcademyOption } from "./types";

interface OnboardingGateProps {
  practitionerId: string;
}

export async function OnboardingGate({ practitionerId }: OnboardingGateProps) {
  const repo = new SupabaseOnboardingProgressRepository();
  const progress = await getOrInitOnboardingProgress(practitionerId, { repo });

  if (progress.completedAt !== null) {
    return null;
  }

  const { data: academyRows } = await adminSupabase
    .from("academies")
    .select("id, name")
    .contains("responsible_instructor_ids", [practitionerId])
    .eq("is_active", true)
    .order("name", { ascending: true });

  const instructorAcademies: AcademyOption[] = (academyRows ?? []).map(
    (a: { id: string; name: string }) => ({ id: a.id, name: a.name }),
  );

  const progressDTO: OnboardingProgressDTO = {
    stepCreateAcademyCompleted: progress.stepCreateAcademyCompleted,
    stepRegisterStudentsCompleted: progress.stepRegisterStudentsCompleted,
    stepEventsInfoCompleted: progress.stepEventsInfoCompleted,
    completedAt: progress.completedAt,
  };

  const initialOpen =
    !progress.stepCreateAcademyCompleted &&
    !progress.stepRegisterStudentsCompleted &&
    !progress.stepEventsInfoCompleted;

  return (
    <OnboardingChecklist
      progressDTO={progressDTO}
      initialOpen={initialOpen}
      instructorAcademies={instructorAcademies}
    />
  );
}

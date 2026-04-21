import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { DrizzleGradeExamRepository } from "@/modules/grade-exam/infrastructure/repositories/drizzleGradeExamRepository";
import { DrizzleExamTemplateRepository } from "@/modules/grade-exam/infrastructure/repositories/drizzleExamTemplateRepository";
import { ExamScoreForm } from "./ExamScoreForm";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INSTRUCTOR_ROLES = ["instructor", "profesor", "maestro"];

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

export default async function InstructorGradeExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const user = await requireUser();
  const { examId } = await params;

  // Auth guard: must be an instructor
  const { data: instructor } = await adminSupabase
    .from("practitioners")
    .select("id, full_name, role")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!instructor || !INSTRUCTOR_ROLES.includes(instructor.role ?? "")) {
    redirect("/dashboard");
  }

  // Fetch exam
  const examRepo = new DrizzleGradeExamRepository();
  const exam = await examRepo.findById(examId);
  if (!exam) notFound();

  // Verify instructor owns the exam (Req 10.1)
  if (exam.instructorId !== instructor.id) {
    redirect("/instructor/grade-exams");
  }

  // Fetch template to get minimumPassScore
  const templateRepo = new DrizzleExamTemplateRepository();
  const template = await templateRepo.findById(exam.templateId);
  const minimumPassScore = template?.minimumPassScore ?? 60;

  // Fetch practitioner name for display
  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("full_name")
    .eq("id", exam.practitionerId)
    .maybeSingle();

  const practitionerName = practitioner?.full_name ?? exam.practitionerId;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/instructor/grade-exams"
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver al listado
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-50 tracking-tight mt-2">
          Examen de grado — {practitionerName}
        </h1>
      </div>

      <ExamScoreForm
        exam={exam}
        minimumPassScore={minimumPassScore}
        practitionerName={practitionerName}
      />
    </main>
  );
}

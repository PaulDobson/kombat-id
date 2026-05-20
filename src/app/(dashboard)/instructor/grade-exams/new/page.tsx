import { adminSupabase } from "@/lib/supabase/admin";
import { requireInstructor } from "@/lib/auth-guards";
import { StartExamForm } from "./StartExamForm";

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

export default async function NewGradeExamPage({
  searchParams,
}: {
  searchParams: Promise<{ practitionerId?: string }>;
}) {
  const session = await requireInstructor();
  const sp = await searchParams;

  // Fetch instructor's active students via academy membership
  const { data: academyRows } = await adminSupabase
    .from("academies")
    .select("id")
    .contains("responsible_instructor_ids", [session.practitionerId]);

  const academyIds = (academyRows ?? []).map((a: { id: string }) => a.id);

  let studentRows: Array<{
    id: string;
    full_name: string;
    rut: string;
    grade: string;
  }> = [];
  if (academyIds.length > 0) {
    const { data: memberships } = await adminSupabase
      .from("academy_memberships")
      .select("practitioner_id")
      .in("academy_id", academyIds)
      .eq("is_active", true);

    const memberIds = (memberships ?? []).map(
      (m: { practitioner_id: string }) => m.practitioner_id,
    );

    if (memberIds.length > 0) {
      const { data: rows } = await adminSupabase
        .from("practitioners")
        .select("id, full_name, rut, grade")
        .in("id", memberIds)
        .eq("role", "alumno")
        .eq("is_active", true)
        .order("full_name");
      studentRows = (rows ?? []) as typeof studentRows;
    }
  }

  const students = studentRows.map((s) => ({
    id: s.id as string,
    fullName: s.full_name as string,
    rut: s.rut as string,
    grade: s.grade as string,
  }));

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Iniciar examen de grado
        </h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          Selecciona el alumno y configura los parámetros del examen.
        </p>
      </div>

      <StartExamForm
        students={students}
        {...(sp.practitionerId !== undefined && {
          preselectedPractitionerId: sp.practitionerId,
        })}
      />
    </main>
  );
}

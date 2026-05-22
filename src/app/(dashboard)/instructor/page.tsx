import { requireInstructor } from "@/lib/auth-guards";
import { adminSupabase } from "@/lib/supabase/admin";
import { StudentSection } from "./_sections/StudentSection";
import { AcademySection } from "./_sections/AcademySection";
import { CertificationRequestSection } from "./_sections/CertificationRequestSection";

export default async function InstructorPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; reqPage?: string; q?: string }>;
}) {
  const session = await requireInstructor();
  const sp = await searchParams;

  const searchQuery = sp.q?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const reqPage = Math.max(1, parseInt(sp.reqPage ?? "1", 10));

  // Fetch academies and member IDs once — shared by StudentSection and CertificationRequestSection
  const [academyResult, memberResult] = await Promise.all([
    adminSupabase
      .from("academies")
      .select("id, name, region, city, is_active")
      .contains("responsible_instructor_ids", [session.practitionerId]),
    adminSupabase
      .from("academies")
      .select("id")
      .contains("responsible_instructor_ids", [session.practitionerId]),
  ]);

  const academies = academyResult.data ?? [];
  const academyIds = (memberResult.data ?? []).map((a: { id: string }) => a.id);

  let academyMemberIds: string[] = [];
  if (academyIds.length > 0) {
    const { data: memberships } = await adminSupabase
      .from("academy_memberships")
      .select("practitioner_id")
      .in("academy_id", academyIds)
      .eq("is_active", true);
    academyMemberIds = (memberships ?? []).map(
      (m: { practitioner_id: string }) => m.practitioner_id,
    );
  }

  // Also include students directly assigned to this instructor via instructor_id
  // (covers students registered without an academy, or before academy assignment)
  const { data: directStudents } = await adminSupabase
    .from("practitioners")
    .select("id")
    .eq("instructor_id", session.practitionerId)
    .not("role", "in", '("instructor","profesor","maestro")');

  const directStudentIds = (directStudents ?? []).map(
    (s: { id: string }) => s.id,
  );

  // Merge both sets, deduplicated
  const allStudentIds = [
    ...new Set([...academyMemberIds, ...directStudentIds]),
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Panel de Instructor
        </h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          Bienvenido, {session.fullName}
        </p>
      </div>

      <AcademySection academies={academies} />
      <StudentSection
        practitionerId={session.practitionerId}
        searchQuery={searchQuery}
        page={page}
        academyMemberIds={allStudentIds}
      />

      <CertificationRequestSection
        practitionerId={session.practitionerId}
        reqPage={reqPage}
        currentPage={sp.page}
        academyMemberIds={allStudentIds}
      />
    </main>
  );
}

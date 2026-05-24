import { requireInstructor } from "@/lib/auth-guards";
import { adminSupabase } from "@/lib/supabase/admin";
import { StudentSection } from "./_sections/StudentSection";
import { AcademySection } from "./_sections/AcademySection";
import { CertificationRequestSection } from "./_sections/CertificationRequestSection";
import { Building2, Users, GraduationCap } from "lucide-react";

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
  const activeAcademies = academies.filter((a) => a.is_active).length;
  const firstName = session.fullName.split(" ")[0] ?? session.fullName;

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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-primary-400 uppercase tracking-widest mb-1">
          Panel de Instructor
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-50">
          Bienvenido, {firstName}
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Gestiona tus academias, alumnos y solicitudes de certificación
        </p>
      </div>

      {/* ── STAT CARDS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5">
          <div className="w-9 h-9 rounded-xl bg-blue-400/10 flex items-center justify-center mb-3">
            <Building2 className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400 tracking-tight">
            {academies.length}
          </p>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Academia{academies.length !== 1 ? "s" : ""}
          </p>
          {academies.length > 0 && (
            <p className="text-xs text-neutral-600 mt-1">
              {activeAcademies} activa{activeAcademies !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-400/10 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 tracking-tight">
            {allStudentIds.length}
          </p>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Alumno{allStudentIds.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-neutral-900 border border-neutral-700 rounded-2xl p-5">
          <div className="w-9 h-9 rounded-xl bg-purple-400/10 flex items-center justify-center mb-3">
            <GraduationCap className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400 tracking-tight">
            {academies.length > 0
              ? `${Math.round((activeAcademies / academies.length) * 100)}%`
              : "—"}
          </p>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Academias activas
          </p>
        </div>
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

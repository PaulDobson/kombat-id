import { requireInstructor } from "@/lib/auth-guards";
import { adminSupabase } from "@/lib/supabase/admin";
import { ActivityWidgets } from "./_sections/ActivityWidgets";
import { AcademySection } from "./_sections/AcademySection";
import { StudentSection } from "./_sections/StudentSection";
import { DrizzleGradeExamRepository } from "@/modules/grade-exam/infrastructure/repositories/drizzleGradeExamRepository";
import { OnboardingGate } from "@/modules/instructor-onboarding/presentation/components/OnboardingGate";
import {
  Users,
  AlertTriangle,
  ArrowRight,
  GraduationCap,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

export default async function InstructorPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    inactive?: string;
  }>;
}) {
  const session = await requireInstructor();
  const sp = await searchParams;

  const searchQuery = sp.q?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const showInactive = sp.inactive === "1";

  const today = new Date().toISOString().slice(0, 10);
  const firstName = session.fullName.split(" ")[0] ?? session.fullName;

  // ── Fetch core data in parallel ────────────────────────────────────────
  const [academyResult, upcomingEventsResult] = await Promise.all([
    adminSupabase
      .from("academies")
      .select("id, name, region, city, is_active")
      .contains("responsible_instructor_ids", [session.practitionerId]),
    adminSupabase
      .from("martial_events")
      .select("id, name, event_type, event_date, location")
      .gt("event_date", today)
      .order("event_date", { ascending: true })
      .limit(5),
  ]);

  const academies = academyResult.data ?? [];
  const academyIds = academies.map((a) => a.id);

  // ── Membership data (student counts + pending per academy) ─────────────
  let membershipRows: Array<{
    practitioner_id: string;
    academy_id: string;
    practitioners: { is_active: boolean; auth_user_id: string | null } | null;
  }> = [];

  if (academyIds.length > 0) {
    const { data: memberships } = await adminSupabase
      .from("academy_memberships")
      .select(
        "practitioner_id, academy_id, practitioners(is_active, auth_user_id)",
      )
      .in("academy_id", academyIds);
    membershipRows = (memberships ?? []) as typeof membershipRows;
  }

  // Build per-academy maps
  const studentCountByAcademy = new Map<string, number>();
  const pendingCountByAcademy = new Map<string, number>();

  for (const row of membershipRows) {
    studentCountByAcademy.set(
      row.academy_id,
      (studentCountByAcademy.get(row.academy_id) ?? 0) + 1,
    );
    const p = row.practitioners;
    if (p && !p.is_active && p.auth_user_id === null) {
      pendingCountByAcademy.set(
        row.academy_id,
        (pendingCountByAcademy.get(row.academy_id) ?? 0) + 1,
      );
    }
  }

  const academiesWithStats = academies.map((a) => ({
    ...a,
    studentCount: studentCountByAcademy.get(a.id) ?? 0,
    pendingCount: pendingCountByAcademy.get(a.id) ?? 0,
  }));

  // ── All student IDs (academy members + direct students) ────────────────
  const academyMemberIds = [
    ...new Set(membershipRows.map((m) => m.practitioner_id)),
  ];

  const { data: directStudents } = await adminSupabase
    .from("practitioners")
    .select("id")
    .eq("instructor_id", session.practitionerId)
    .not("role", "in", '("instructor","profesor","maestro")');

  const directStudentIds = (directStudents ?? []).map(
    (s: { id: string }) => s.id,
  );
  const allStudentIds = [
    ...new Set([...academyMemberIds, ...directStudentIds]),
  ];

  // Total pending activation count (global)
  const totalPending = Array.from(pendingCountByAcademy.values()).reduce(
    (sum, n) => sum + n,
    0,
  );

  // ── Recent exams (last 5) ──────────────────────────────────────────────
  const gradeExamRepo = new DrizzleGradeExamRepository();
  const allExams = await gradeExamRepo.findByInstructor(session.practitionerId);
  const recentExamsRaw = allExams.slice(0, 5);

  const examPractitionerIds = [
    ...new Set(recentExamsRaw.map((e) => e.practitionerId)),
  ];
  const practitionerNameMap = new Map<string, string>();
  if (examPractitionerIds.length > 0) {
    const { data: pRows } = await adminSupabase
      .from("practitioners")
      .select("id, full_name")
      .in("id", examPractitionerIds);
    for (const r of pRows ?? []) {
      practitionerNameMap.set(r.id, r.full_name ?? r.id);
    }
  }

  const recentExams = recentExamsRaw.map((e) => ({
    id: e.id,
    practitionerName:
      practitionerNameMap.get(e.practitionerId) ?? e.practitionerId,
    fromGrade: e.fromGrade,
    toGrade: e.toGrade,
    status: e.status,
    examDate: e.examDate ?? "",
  }));

  // ── Upcoming events ────────────────────────────────────────────────────
  const upcomingEvents = (upcomingEventsResult.data ?? []).map(
    (e: {
      id: string;
      name: string;
      event_type: string;
      event_date: string;
      location: string | null;
    }) => ({
      id: e.id,
      name: e.name,
      eventType: e.event_type,
      eventDate: e.event_date,
      location: e.location,
    }),
  );

  // ── Attention items ────────────────────────────────────────────────────
  const draftExamsCount = allExams.filter((e) => e.status === "draft").length;
  const attentionItems: Array<{
    label: string;
    href: string;
    icon: React.ElementType;
  }> = [];

  if (totalPending > 0) {
    attentionItems.push({
      label: `${totalPending} alumno${totalPending !== 1 ? "s" : ""} pendiente${totalPending !== 1 ? "s" : ""} de activación`,
      href: "/instructor?inactive=1",
      icon: UserPlus,
    });
  }
  if (draftExamsCount > 0) {
    attentionItems.push({
      label: `${draftExamsCount} examen${draftExamsCount !== 1 ? "es" : ""} en borrador sin enviar`,
      href: "/instructor/grade-exams",
      icon: GraduationCap,
    });
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-primary-400 uppercase tracking-widest mb-1">
            Panel de Instructor
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-50">
            Bienvenido, {firstName}
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            {academies.length} academia{academies.length !== 1 ? "s" : ""} ·{" "}
            {allStudentIds.length} alumno{allStudentIds.length !== 1 ? "s" : ""}
          </p>
        </div>
        {/* Quick link to all students */}
        {allStudentIds.length > 0 && (
          <Link
            href="#todos-los-alumnos"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors border border-neutral-700 hover:border-neutral-600 bg-neutral-900 px-3 py-2 rounded-lg"
          >
            <Users className="w-3.5 h-3.5" />
            Ver todos los alumnos
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      <OnboardingGate practitionerId={session.practitionerId} />

      {/* ── BANNER: Atención requerida ───────────────────────────── */}
      {attentionItems.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-300 mb-2">
                Requiere tu atención
              </p>
              <ul className="space-y-1.5">
                {attentionItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-300 transition-colors"
                    >
                      <ArrowRight className="w-3 h-3 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── MIS ACADEMIAS ───────────────────────────────────────── */}
      <AcademySection academies={academiesWithStats} />

      {/* ── ACTIVIDAD RECIENTE ──────────────────────────────────── */}
      <ActivityWidgets
        recentExams={recentExams}
        upcomingEvents={upcomingEvents}
      />

      {/* ── TODOS LOS ALUMNOS ───────────────────────────────────── */}
      {allStudentIds.length > 0 && (
        <section id="todos-los-alumnos" className="space-y-4 scroll-mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-neutral-100">
                  Todos los alumnos
                </h2>
                <p className="text-xs text-neutral-500">
                  Vista global · todas las academias
                </p>
              </div>
            </div>
          </div>
          <StudentSection
            practitionerId={session.practitionerId}
            searchQuery={searchQuery}
            page={page}
            academyMemberIds={allStudentIds}
            showInactive={showInactive}
          />
        </section>
      )}
    </main>
  );
}

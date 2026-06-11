import { requireInstructor } from "@/lib/auth-guards";
import { adminSupabase } from "@/lib/supabase/admin";
import { StudentSection } from "./_sections/StudentSection";
import { DashboardTabs } from "./_sections/DashboardTabs";
import { ActivityWidgets } from "./_sections/ActivityWidgets";
import { DrizzleGradeExamRepository } from "@/modules/grade-exam/infrastructure/repositories/drizzleGradeExamRepository";
import {
  Building2,
  Users,
  UserX,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default async function InstructorPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
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
  const defaultTab = sp.tab === "students" ? "students" : "academies";

  const today = new Date().toISOString().slice(0, 10);

  // ── Fetch all data in parallel ──────────────────────────────────────────
  const [academyResult, memberResult, upcomingEventsResult] = await Promise.all(
    [
      adminSupabase
        .from("academies")
        .select("id, name, region, city, is_active")
        .contains("responsible_instructor_ids", [session.practitionerId]),
      adminSupabase
        .from("academies")
        .select("id")
        .contains("responsible_instructor_ids", [session.practitionerId]),
      adminSupabase
        .from("martial_events")
        .select("id, name, event_type, event_date, location")
        .gt("event_date", today)
        .order("event_date", { ascending: true })
        .limit(5),
    ],
  );

  const academies = academyResult.data ?? [];
  const academyIds = (memberResult.data ?? []).map((a: { id: string }) => a.id);
  const activeAcademies = academies.filter((a) => a.is_active).length;
  const firstName = session.fullName.split(" ")[0] ?? session.fullName;

  // ── Academy memberships ─────────────────────────────────────────────────
  let membershipRows: Array<{ practitioner_id: string; academy_id: string }> =
    [];
  if (academyIds.length > 0) {
    const { data: memberships } = await adminSupabase
      .from("academy_memberships")
      .select("practitioner_id, academy_id")
      .in("academy_id", academyIds);
    membershipRows = (memberships ?? []) as Array<{
      practitioner_id: string;
      academy_id: string;
    }>;
  }

  const academyMemberIds = [
    ...new Set(membershipRows.map((m) => m.practitioner_id)),
  ];

  // Student count per academy for the card display
  const studentCountByAcademy = new Map<string, number>();
  for (const row of membershipRows) {
    studentCountByAcademy.set(
      row.academy_id,
      (studentCountByAcademy.get(row.academy_id) ?? 0) + 1,
    );
  }
  const academiesWithCount = academies.map((a) => ({
    ...a,
    studentCount: studentCountByAcademy.get(a.id) ?? 0,
  }));

  // ── Direct students (no academy) ────────────────────────────────────────
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

  // ── KPI: pending activation ─────────────────────────────────────────────
  let pendingActivationCount = 0;
  if (allStudentIds.length > 0) {
    const { count } = await adminSupabase
      .from("practitioners")
      .select("id", { count: "exact", head: true })
      .in("id", allStudentIds)
      .is("auth_user_id", null)
      .eq("is_active", false);
    pendingActivationCount = count ?? 0;
  }

  // ── Recent exams (last 5) for widget ────────────────────────────────────
  const gradeExamRepo = new DrizzleGradeExamRepository();
  const allExams = await gradeExamRepo.findByInstructor(session.practitionerId);
  const recentExamsRaw = allExams.slice(0, 5);

  // Enrich with practitioner names
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

  // ── Upcoming events ─────────────────────────────────────────────────────
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

  // ── Attention banner items ──────────────────────────────────────────────
  const draftExamsCount = allExams.filter((e) => e.status === "draft").length;
  const attentionItems: Array<{ label: string; href: string }> = [];
  if (pendingActivationCount > 0) {
    attentionItems.push({
      label: `${pendingActivationCount} alumno${pendingActivationCount !== 1 ? "s" : ""} pendiente${pendingActivationCount !== 1 ? "s" : ""} de activación`,
      href: "/instructor?tab=students&inactive=1",
    });
  }
  if (draftExamsCount > 0) {
    attentionItems.push({
      label: `${draftExamsCount} examen${draftExamsCount !== 1 ? "es" : ""} en borrador sin enviar`,
      href: "/instructor/grade-exams",
    });
  }

  // ── Pre-render server slot ───────────────────────────────────────────────
  const studentSection = (
    <StudentSection
      practitionerId={session.practitionerId}
      searchQuery={searchQuery}
      page={page}
      academyMemberIds={allStudentIds}
      showInactive={showInactive}
    />
  );

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
          Gestiona tus academias y alumnos
        </p>
      </div>

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

      {/* ── STAT CARDS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {/* KPI 1: Total academies */}
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

        {/* KPI 2: Total students */}
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

        {/* KPI 3: Pending activation */}
        <div className="col-span-2 sm:col-span-1 bg-neutral-900 border border-neutral-700 rounded-2xl p-5">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 flex items-center justify-center mb-3">
            <UserX className="w-5 h-5 text-amber-400" />
          </div>
          <p
            className={`text-2xl font-bold tracking-tight ${
              pendingActivationCount > 0 ? "text-amber-400" : "text-neutral-500"
            }`}
          >
            {pendingActivationCount}
          </p>
          <p className="text-xs text-neutral-400 font-medium mt-0.5">
            Pendiente{pendingActivationCount !== 1 ? "s" : ""} de activación
          </p>
          {pendingActivationCount > 0 && (
            <p className="text-xs text-amber-600 mt-1">Sin cuenta activa</p>
          )}
        </div>
      </div>

      {/* ── ACTIVITY WIDGETS: Exámenes + Eventos ────────────────── */}
      <ActivityWidgets
        recentExams={recentExams}
        upcomingEvents={upcomingEvents}
      />

      {/* ── TABS: Academias / Alumnos ────────────────────────────── */}
      <DashboardTabs
        academies={academiesWithCount}
        studentSection={studentSection}
        defaultTab={defaultTab}
      />
    </main>
  );
}

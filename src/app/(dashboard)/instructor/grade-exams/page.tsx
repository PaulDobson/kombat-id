import { adminSupabase } from "@/lib/supabase/admin";
import Link from "next/link";
import { requireInstructor } from "@/lib/auth-guards";
import { DrizzleGradeExamRepository } from "@/modules/grade-exam/infrastructure/repositories/drizzleGradeExamRepository";
import { formatDateShort } from "@/lib/format-date";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  pending_authorization: "Pendiente auth",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-neutral-800 text-neutral-400 border-neutral-700",
  submitted: "bg-blue-900/50 text-blue-400 border-blue-800",
  pending_authorization: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
  approved: "bg-emerald-900/50 text-emerald-400 border-emerald-800",
  rejected: "bg-red-900/50 text-red-400 border-red-800",
};

const RESULT_LABELS: Record<string, string> = {
  approved: "Aprobado",
  failed: "Reprobado",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchPractitionerNames(
  ids: string[],
  instructorId: string,
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  // 1. Find the academies where this instructor is responsible
  const { data: academies } = await adminSupabase
    .from("academies")
    .select("id")
    .contains("responsible_instructor_ids", [instructorId])
    .eq("is_active", true);

  const academyIds = (academies ?? []).map((a) => a.id as string);
  if (academyIds.length === 0) return new Map();

  // 2. Find which of the requested IDs have an active membership in those academies
  const { data: memberships } = await adminSupabase
    .from("academy_memberships")
    .select("practitioner_id")
    .in("academy_id", academyIds)
    .in("practitioner_id", ids)
    .eq("is_active", true);

  const allowedIds = (memberships ?? []).map(
    (m) => m.practitioner_id as string,
  );
  if (allowedIds.length === 0) return new Map();

  // 3. Fetch names only for practitioners that belong to the instructor's academy
  const { data } = await adminSupabase
    .from("practitioners")
    .select("id, full_name")
    .in("id", allowedIds);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.id, row.full_name ?? row.id);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function InstructorGradeExamsPage() {
  const session = await requireInstructor();

  // Fetch exams for this instructor
  const repo = new DrizzleGradeExamRepository();
  const allExams = await repo.findByInstructor(session.practitionerId);

  // Simple pagination: first 20, note if more
  const exams = allExams.slice(0, PAGE_SIZE);
  const hasMore = allExams.length > PAGE_SIZE;

  // Batch-load practitioner names for the Alumno column
  const practitionerIds = [...new Set(exams.map((e) => e.practitionerId))];
  const nameMap = await fetchPractitionerNames(
    practitionerIds,
    session.practitionerId,
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Mis exámenes de grado
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            {allExams.length} examen{allExams.length !== 1 ? "es" : ""} en total
          </p>
        </div>
        <Link
          href="/instructor/grade-exams/new"
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Nuevo examen
        </Link>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        {exams.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-500 text-sm">
              Aún no has creado exámenes de grado.
            </p>
            <Link
              href="/instructor/grade-exams/new"
              className="mt-4 inline-block text-primary-400 hover:text-primary-300 text-sm transition-colors"
            >
              Crear el primer examen →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-900/80">
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Alumno
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Transición
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                    Resultado
                  </th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {exams.map((exam) => {
                  const statusStyle =
                    STATUS_STYLES[exam.status] ??
                    "bg-neutral-800 text-neutral-400 border-neutral-700";
                  return (
                    <tr
                      key={exam.id}
                      className="hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-neutral-100 font-medium whitespace-nowrap">
                        {nameMap.get(exam.practitionerId) ??
                          exam.practitionerId}
                      </td>
                      <td className="px-4 py-3 text-neutral-300 whitespace-nowrap">
                        {GRADE_LABELS[exam.fromGrade] ?? exam.fromGrade}
                        {" → "}
                        {GRADE_LABELS[exam.toGrade] ?? exam.toGrade}
                      </td>
                      <td className="px-4 py-3 text-neutral-400 tabular-nums text-xs hidden md:table-cell whitespace-nowrap">
                        {formatDateShort(exam.examDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyle}`}
                        >
                          {STATUS_LABELS[exam.status] ?? exam.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {exam.finalResult ? (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                              exam.finalResult === "approved"
                                ? "bg-emerald-900/50 text-emerald-400 border-emerald-800"
                                : "bg-red-900/50 text-red-400 border-red-800"
                            }`}
                          >
                            {RESULT_LABELS[exam.finalResult] ??
                              exam.finalResult}
                          </span>
                        ) : (
                          <span className="text-neutral-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/instructor/grade-exams/${exam.id}`}
                          className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination note */}
      {hasMore && (
        <p className="text-xs text-neutral-500 text-center">
          Mostrando los primeros {PAGE_SIZE} exámenes de {allExams.length} en
          total.
        </p>
      )}
    </main>
  );
}

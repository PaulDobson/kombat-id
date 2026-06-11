import { adminSupabase } from "@/lib/supabase/admin";
import Link from "next/link";
import { requireInstructor } from "@/lib/auth-guards";
import { DrizzleGradeExamRepository } from "@/modules/grade-exam/infrastructure/repositories/drizzleGradeExamRepository";
import { formatDateShort } from "@/lib/format-date";
import {
  ArrowLeft,
  GraduationCap,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileEdit,
  ArrowRight,
} from "lucide-react";

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

const GRADE_DOT: Record<string, string> = {
  white: "bg-white",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  red: "bg-red-500",
  black: "bg-neutral-900 border border-neutral-600",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  pending_authorization: "Pendiente auth.",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-neutral-800 text-neutral-400 border-neutral-700",
  submitted: "bg-blue-500/10 text-blue-400 border-blue-500/25",
  pending_authorization: "bg-amber-500/10 text-amber-400 border-amber-500/25",
  approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  rejected: "bg-red-500/10 text-red-400 border-red-500/25",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  draft: FileEdit,
  submitted: Clock,
  pending_authorization: AlertCircle,
  approved: CheckCircle,
  rejected: XCircle,
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

  const { data: academies } = await adminSupabase
    .from("academies")
    .select("id")
    .contains("responsible_instructor_ids", [instructorId])
    .eq("is_active", true);

  const academyIds = (academies ?? []).map((a) => a.id as string);
  if (academyIds.length === 0) return new Map();

  const { data: memberships } = await adminSupabase
    .from("academy_memberships")
    .select("practitioner_id")
    .in("academy_id", academyIds)
    .in("practitioner_id", ids);

  const allowedIds = (memberships ?? []).map(
    (m) => m.practitioner_id as string,
  );
  if (allowedIds.length === 0) return new Map();

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

  const repo = new DrizzleGradeExamRepository();
  const allExams = await repo.findByInstructor(session.practitionerId);

  const exams = allExams.slice(0, PAGE_SIZE);
  const hasMore = allExams.length > PAGE_SIZE;

  const practitionerIds = [...new Set(exams.map((e) => e.practitionerId))];
  const nameMap = await fetchPractitionerNames(
    practitionerIds,
    session.practitionerId,
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href="/instructor"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al panel
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
                Exámenes de grado
              </h1>
              <p className="text-sm text-neutral-400">
                {allExams.length} examen{allExams.length !== 1 ? "es" : ""} en
                total
              </p>
            </div>
          </div>
          <Link
            href="/instructor/grade-exams/new"
            className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo examen
          </Link>
        </div>
      </div>

      {/* Content */}
      {exams.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-neutral-600" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-neutral-400 text-sm font-medium">
              Aún no has creado exámenes de grado
            </p>
            <p className="text-neutral-600 text-xs">
              Registra el progreso de tus alumnos en sus exámenes
            </p>
          </div>
          <Link
            href="/instructor/grade-exams/new"
            className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear primer examen
          </Link>
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/80">
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Alumno
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Transición
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider hidden sm:table-cell">
                    Resultado
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {exams.map((exam) => {
                  const statusStyle =
                    STATUS_STYLES[exam.status] ??
                    "bg-neutral-800 text-neutral-400 border-neutral-700";
                  const StatusIcon = STATUS_ICON[exam.status] ?? Clock;
                  const fromDot = GRADE_DOT[exam.fromGrade] ?? "bg-neutral-600";
                  const toDot = GRADE_DOT[exam.toGrade] ?? "bg-neutral-600";

                  return (
                    <tr
                      key={exam.id}
                      className="hover:bg-neutral-800/40 transition-colors group"
                    >
                      <td className="px-4 py-3 text-neutral-100 font-medium whitespace-nowrap">
                        {nameMap.get(exam.practitionerId) ??
                          exam.practitionerId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 text-xs text-neutral-300">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${fromDot}`}
                          />
                          {GRADE_LABELS[exam.fromGrade] ?? exam.fromGrade}
                          <ArrowRight className="w-3 h-3 text-neutral-600" />
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${toDot}`}
                          />
                          {GRADE_LABELS[exam.toGrade] ?? exam.toGrade}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-400 tabular-nums text-xs hidden md:table-cell whitespace-nowrap">
                        {formatDateShort(exam.examDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyle}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {STATUS_LABELS[exam.status] ?? exam.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {exam.finalResult ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              exam.finalResult === "approved"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                : "bg-red-500/10 text-red-400 border-red-500/25"
                            }`}
                          >
                            {exam.finalResult === "approved" ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
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
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-primary-400 hover:text-primary-300 hover:bg-neutral-800 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                          <span className="sr-only">Ver examen</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasMore && (
        <p className="text-xs text-neutral-500 text-center">
          Mostrando los primeros {PAGE_SIZE} exámenes de {allExams.length} en
          total.
        </p>
      )}
    </main>
  );
}

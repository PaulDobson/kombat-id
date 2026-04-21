import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DrizzleGradeExamRepository } from "@/modules/grade-exam/infrastructure/repositories/drizzleGradeExamRepository";

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await adminSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) redirect("/dashboard");
  return user;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchPractitionerNames(
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  const { data } = await adminSupabase
    .from("practitioners")
    .select("id, full_name")
    .in("id", ids);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.id, row.full_name ?? row.id);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminGradeExamsPage() {
  await requireAdminUser();

  const repo = new DrizzleGradeExamRepository();
  const exams = await repo.findPendingAuthorization();

  // Batch-load practitioner names for both alumno and instructor columns
  const allIds = [
    ...new Set(exams.flatMap((e) => [e.practitionerId, e.instructorId])),
  ];
  const nameMap = await fetchPractitionerNames(allIds);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Exámenes pendientes de autorización
        </h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          {exams.length} examen{exams.length !== 1 ? "es" : ""} pendiente
          {exams.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        {exams.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-500 text-sm">
              No hay exámenes pendientes de autorización.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-900/80">
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Alumno
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                    Instructor
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Transición
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Puntaje %
                  </th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {exams.map((exam) => (
                  <tr
                    key={exam.id}
                    className="hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-neutral-100 font-medium whitespace-nowrap">
                      {nameMap.get(exam.practitionerId) ?? exam.practitionerId}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 text-xs hidden sm:table-cell whitespace-nowrap">
                      {nameMap.get(exam.instructorId) ?? exam.instructorId}
                    </td>
                    <td className="px-4 py-3 text-neutral-300 whitespace-nowrap">
                      {GRADE_LABELS[exam.fromGrade] ?? exam.fromGrade}
                      {" → "}
                      {GRADE_LABELS[exam.toGrade] ?? exam.toGrade}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 tabular-nums text-xs hidden md:table-cell whitespace-nowrap">
                      {new Date(exam.examDate).toLocaleDateString("es-CL")}
                    </td>
                    <td className="px-4 py-3 text-neutral-300 tabular-nums">
                      {exam.scorePercentage.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/grade-exams/${exam.id}`}
                        className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

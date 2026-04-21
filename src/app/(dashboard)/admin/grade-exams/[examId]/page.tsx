import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { DrizzleGradeExamRepository } from "@/modules/grade-exam/infrastructure/repositories/drizzleGradeExamRepository";
import { ExamAuthorizationActions } from "./ExamAuthorizationActions";

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

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  pending_authorization: "Pendiente de autorización",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-neutral-800 text-neutral-400 border-neutral-700",
  submitted: "bg-blue-900/40 text-blue-400 border-blue-800",
  pending_authorization: "bg-amber-900/40 text-amber-400 border-amber-800",
  approved: "bg-emerald-900/40 text-emerald-400 border-emerald-800",
  rejected: "bg-rose-900/40 text-rose-400 border-rose-800",
};

const RESULT_LABELS: Record<string, string> = {
  approved: "Aprobado",
  failed: "Reprobado",
};

const RESULT_COLORS: Record<string, string> = {
  approved: "text-emerald-400",
  failed: "text-rose-400",
};

// ---------------------------------------------------------------------------
// Helper: resolve practitioner name
// ---------------------------------------------------------------------------

async function getPractitionerName(id: string): Promise<string> {
  const { data } = await adminSupabase
    .from("practitioners")
    .select("full_name")
    .eq("id", id)
    .maybeSingle();
  return data?.full_name ?? id;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function GradeExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  await requireAdminUser();
  const { examId } = await params;

  const repo = new DrizzleGradeExamRepository();
  const exam = await repo.findById(examId);
  if (!exam) notFound();

  const [practitionerName, instructorName] = await Promise.all([
    getPractitionerName(exam.practitionerId),
    getPractitionerName(exam.instructorId),
  ]);

  const examDate = new Date(exam.examDate).toLocaleDateString("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const statusClass =
    STATUS_COLORS[exam.status] ??
    "bg-neutral-800 text-neutral-400 border-neutral-700";

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back link */}
      <div>
        <Link
          href="/admin/grade-exams"
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver al listado
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-semibold text-neutral-50 tracking-tight">
            Examen de grado
          </h1>
          <span
            className={`border px-2 py-0.5 rounded-full text-xs ${statusClass}`}
          >
            {STATUS_LABELS[exam.status] ?? exam.status}
          </span>
        </div>
      </div>

      {/* General info */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-neutral-50 mb-4">
          Información general
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Alumno
            </dt>
            <dd className="text-neutral-200">{practitionerName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Instructor
            </dt>
            <dd className="text-neutral-200">{instructorName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Transición
            </dt>
            <dd className="text-neutral-200">
              {GRADE_LABELS[exam.fromGrade] ?? exam.fromGrade}
              {" → "}
              {GRADE_LABELS[exam.toGrade] ?? exam.toGrade}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Fecha de examen
            </dt>
            <dd className="text-neutral-200">{examDate}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Puntaje %
            </dt>
            <dd className="text-neutral-200 tabular-nums">
              {exam.scorePercentage.toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Resultado calculado
            </dt>
            <dd
              className={
                RESULT_COLORS[exam.calculatedResult] ?? "text-neutral-200"
              }
            >
              {RESULT_LABELS[exam.calculatedResult] ?? exam.calculatedResult}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Resultado final
            </dt>
            <dd
              className={`font-medium ${RESULT_COLORS[exam.finalResult] ?? "text-neutral-200"}`}
            >
              {RESULT_LABELS[exam.finalResult] ?? exam.finalResult}
            </dd>
          </div>
        </dl>
      </div>

      {/* Items table */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-50">
            Ítems evaluados
          </h2>
          <span className="text-xs text-neutral-400">
            {exam.totalScore} / {exam.maxPossibleScore} pts
          </span>
        </div>
        {exam.items.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-neutral-500 text-sm">Sin ítems registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-900/80">
                  <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Ítem
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider w-32">
                    Puntaje máx.
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider w-32">
                    Puntaje
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {exam.items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-neutral-800/40 transition-colors"
                  >
                    <td className="px-5 py-3 text-neutral-100">
                      {item.itemName}
                    </td>
                    <td className="px-5 py-3 text-neutral-400 tabular-nums text-right">
                      {item.maxScore}
                    </td>
                    <td className="px-5 py-3 text-neutral-200 tabular-nums text-right font-medium">
                      {item.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instructor override */}
      {exam.instructorOverride && (
        <div className="bg-neutral-900 border border-amber-700/40 rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-amber-400">
            Override del instructor
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                Resultado override
              </dt>
              <dd
                className={
                  RESULT_COLORS[exam.overrideResult ?? ""] ?? "text-neutral-200"
                }
              >
                {exam.overrideResult
                  ? (RESULT_LABELS[exam.overrideResult] ?? exam.overrideResult)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                Justificación
              </dt>
              <dd className="text-neutral-200">
                {exam.overrideJustification ?? "—"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Authorization info */}
      {exam.status === "approved" && exam.authorizedBy && (
        <div className="bg-neutral-900 border border-emerald-700/40 rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-400">
            Información de autorización
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                Autorizado por
              </dt>
              <dd className="text-neutral-200">{exam.authorizedBy}</dd>
            </div>
            {exam.authorizedAt && (
              <div>
                <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                  Fecha de autorización
                </dt>
                <dd className="text-neutral-200">
                  {new Date(exam.authorizedAt).toLocaleDateString("es-CL", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Rejection info */}
      {exam.status === "rejected" && (
        <div className="bg-neutral-900 border border-rose-700/40 rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-rose-400">
            Información de rechazo
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                Rechazado por
              </dt>
              <dd className="text-neutral-200">{exam.rejectedBy ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                Motivo
              </dt>
              <dd className="text-neutral-200">
                {exam.rejectionReason ?? "—"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Authorization actions */}
      {exam.status === "pending_authorization" && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-neutral-50">
            Acciones de autorización
          </h2>
          <p className="text-xs text-neutral-500">
            Revisa los detalles del examen antes de autorizar o rechazar.
          </p>
          <ExamAuthorizationActions examId={exam.id} />
        </div>
      )}
    </main>
  );
}

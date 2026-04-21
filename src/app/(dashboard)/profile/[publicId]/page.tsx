import { requireUser } from "@/lib/supabase/server";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleGradeExamRepository } from "@/modules/grade-exam/infrastructure/repositories/drizzleGradeExamRepository";
import { notFound } from "next/navigation";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  submitted: "Enviado",
  pending_authorization: "Pendiente autorización",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const RESULT_LABELS: Record<string, string> = {
  approved: "Aprobado",
  failed: "Reprobado",
};

export default async function PractitionerProfilePage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await requireUser(); // must be authenticated
  const { publicId } = await params;
  const repo = new DrizzlePractitionerRepository();
  const practitioner = await repo.findById(publicId);

  if (!practitioner) notFound();

  const examRepo = new DrizzleGradeExamRepository();
  const exams = await examRepo.findByPractitioner(practitioner.id);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-50 tracking-tight">
          {practitioner.fullName}
        </h1>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-neutral-300">
          <dt className="font-medium text-neutral-400">Grado</dt>
          <dd>
            {practitioner.grade}
            {practitioner.dan ? ` ${practitioner.dan}° Dan` : ""}
          </dd>
          <dt className="font-medium text-neutral-400">Estado</dt>
          <dd>{practitioner.isActive ? "Activo" : "Inactivo"}</dd>
          <dt className="font-medium text-neutral-400">Inicio</dt>
          <dd>{practitioner.startDate}</dd>
        </dl>
      </div>

      {/* Fichas de examen — Req 8.1 */}
      <section>
        <h2 className="text-lg font-semibold text-neutral-50 mb-4">
          Fichas de examen
        </h2>
        {exams.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No hay fichas de examen registradas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-700">
            <table className="w-full text-sm text-neutral-300">
              <thead className="bg-neutral-800 text-neutral-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Transición</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-700">
                {exams.map((exam) => (
                  <tr
                    key={exam.id}
                    className="hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      {new Date(exam.examDate).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3">
                      {exam.fromGrade} → {exam.toGrade}
                    </td>
                    <td className="px-4 py-3">
                      {STATUS_LABELS[exam.status] ?? exam.status}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/instructor/grade-exams/${exam.id}`}
                        className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                      >
                        {exam.finalResult
                          ? (RESULT_LABELS[exam.finalResult] ??
                            exam.finalResult)
                          : "—"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

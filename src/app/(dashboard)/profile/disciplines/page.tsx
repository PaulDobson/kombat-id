import { requireUser } from "@/lib/supabase/server";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleDisciplineGradeRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleDisciplineGradeRepository";
import { getDisciplineGrades } from "@/modules/practitioner-identity/application/use-cases/getDisciplineGrades";
import { notFound } from "next/navigation";

const DISCIPLINE_LABELS: Record<string, string> = {
  kombat_taekwondo: "Kombat Taekwondo",
  taekwondo_wtf: "Taekwondo WTF",
  hapkido: "Hapkido",
  kick_boxing: "Kick Boxing",
  defensa_personal: "Defensa Personal",
};

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

const GRADE_COLORS: Record<string, string> = {
  white: "bg-neutral-100 text-neutral-900 border border-neutral-300",
  yellow: "bg-yellow-400/20 text-yellow-300 border border-yellow-400/40",
  green: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
  blue: "bg-blue-500/20 text-blue-400 border border-blue-500/40",
  red: "bg-rose-500/20 text-rose-400 border border-rose-500/40",
  black: "bg-neutral-800 text-neutral-200 border border-neutral-600",
};

import { formatDateLong as formatDate } from "@/lib/format-date";

export default async function DisciplinesPage() {
  const user = await requireUser();

  const practitionerRepo = new DrizzlePractitionerRepository();
  const disciplineGradeRepo = new DrizzleDisciplineGradeRepository();

  const practitioner = await practitionerRepo.findByAuthUserId(user.id);
  if (!practitioner) notFound();

  const grades = await getDisciplineGrades(
    { practitionerId: practitioner.id },
    { practitionerRepo, disciplineGradeRepo },
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Grados por Disciplina
        </h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          {grades.length} disciplina{grades.length !== 1 ? "s" : ""} registrada
          {grades.length !== 1 ? "s" : ""}
        </p>
      </div>

      {grades.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-12 text-center">
          <p className="text-neutral-500 text-sm">
            No tienes grados por disciplina registrados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {grades.map((dg) => {
            const gradeLabel = `${GRADE_LABELS[dg.grade] ?? dg.grade}${dg.dan ? ` ${dg.dan}° Dan` : ""}`;
            const gradeStyle = GRADE_COLORS[dg.grade] ?? GRADE_COLORS.white;

            return (
              <div
                key={dg.id}
                className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold text-neutral-50">
                    {DISCIPLINE_LABELS[dg.discipline] ?? dg.discipline}
                  </h2>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${gradeStyle}`}
                  >
                    {gradeLabel}
                  </span>
                </div>

                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Obtenido el
                    </dt>
                    <dd className="text-sm text-neutral-200 mt-0.5">
                      {formatDate(dg.obtainedAt)}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

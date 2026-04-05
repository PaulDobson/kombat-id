import { requireUser } from "@/lib/supabase/server";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleRankingRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleRankingRepository";
import { notFound } from "next/navigation";

const WEIGHT_LABELS: Record<string, string> = {
  fin: "Fin",
  fly: "Fly",
  bantam: "Bantam",
  feather: "Pluma",
  light: "Ligero",
  welter: "Welter",
  middle: "Medio",
  heavy: "Pesado",
};

const AGE_LABELS: Record<string, string> = {
  "under-12": "Sub-12",
  "12-17": "12–17 años",
  "18-30": "18–30 años",
  "30+": "30+ años",
};

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function RankingPage() {
  const user = await requireUser();
  const practitionerRepo = new DrizzlePractitionerRepository();
  const rankingRepo = new DrizzleRankingRepository();

  const practitioner = await practitionerRepo.findByAuthUserId(user.id);
  if (!practitioner) notFound();

  const [ranking, snapshots] = await Promise.all([
    rankingRepo.findByPractitioner(practitioner.id),
    rankingRepo.findSnapshots(practitioner.id, "monthly"),
  ]);

  const positionPercent = ranking
    ? Math.max(5, 100 - ((ranking.position - 1) / ranking.categoryCount) * 100)
    : 0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
        Mi Ranking
      </h1>

      {!ranking ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-12 text-center">
          <p className="text-neutral-500 text-sm">
            Sin datos de ranking disponibles.
          </p>
          <p className="text-neutral-600 text-xs mt-1">
            El ranking se calcula al registrar resultados de competencias.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main ranking card */}
          <div className="lg:col-span-2 bg-neutral-900 border border-neutral-700 rounded-xl p-6 space-y-6">
            <div className="flex items-end gap-3">
              <span className="text-6xl font-bold text-warning-400 tracking-tight leading-none">
                #{ranking.position}
              </span>
              <span className="text-neutral-400 text-sm mb-1">
                de {ranking.categoryCount} practicantes
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-neutral-500">
                <span>Posición en categoría</span>
                <span>{positionPercent.toFixed(0)}% percentil</span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full bg-warning-400 rounded-full transition-all duration-700"
                  style={{ width: `${positionPercent}%` }}
                />
              </div>
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-5 text-sm">
              <div>
                <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                  Puntos totales
                </dt>
                <dd className="text-2xl font-bold text-neutral-100">
                  {ranking.totalPoints}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                  Grado
                </dt>
                <dd className="text-neutral-200">
                  {GRADE_LABELS[ranking.grade] ?? ranking.grade}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                  Categoría edad
                </dt>
                <dd className="text-neutral-200">
                  {AGE_LABELS[ranking.ageRange] ?? ranking.ageRange}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                  Peso
                </dt>
                <dd className="text-neutral-200">
                  {WEIGHT_LABELS[ranking.weightCategory] ??
                    ranking.weightCategory}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                  Actualizado
                </dt>
                <dd className="text-neutral-400 text-xs">
                  {formatDate(ranking.calculatedAt)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Snapshots */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-neutral-50">
              Historial mensual
            </h2>
            {snapshots.length === 0 ? (
              <p className="text-neutral-500 text-sm text-center py-6">
                Sin historial.
              </p>
            ) : (
              <ul className="space-y-3">
                {snapshots.slice(0, 6).map((snap) => (
                  <li
                    key={snap.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-neutral-400 text-xs">
                      {snap.periodLabel}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-200 font-medium">
                        #{snap.position}
                      </span>
                      <span className="text-neutral-500 text-xs">
                        {snap.totalPoints} pts
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

import { requireUser } from "@/lib/supabase/server";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleRankingRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleRankingRepository";
import { adminSupabase } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Trophy, Zap, Medal } from "lucide-react";
import {
  GRADE_LABELS,
  WEIGHT_LABELS,
  AGE_RANGE_LABELS,
} from "@/lib/presentation-constants";
import { formatDateLong as formatDate } from "@/lib/format-date";

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

  // Fetch top 10 of the same category to show a leaderboard
  const categoryTop10 = ranking
    ? await rankingRepo.findByCategory({
        grade: ranking.grade as Parameters<
          typeof rankingRepo.findByCategory
        >[0]["grade"],
        ageRange: ranking.ageRange as Parameters<
          typeof rankingRepo.findByCategory
        >[0]["ageRange"],
        weightCategory: ranking.weightCategory as Parameters<
          typeof rankingRepo.findByCategory
        >[0]["weightCategory"],
      })
    : [];

  // Enrich top 10 with practitioner names — single batch query
  const top10Slice = categoryTop10.slice(0, 10);
  const top10Ids = top10Slice.map((r) => r.practitionerId);
  const nameMap = new Map<string, string>();
  if (top10Ids.length > 0) {
    const { data: nameRows } = await adminSupabase
      .from("practitioners")
      .select("id, full_name")
      .in("id", top10Ids);
    for (const row of nameRows ?? []) {
      nameMap.set(row.id as string, row.full_name as string);
    }
  }

  const positionPercent = ranking
    ? Math.max(5, 100 - ((ranking.position - 1) / ranking.categoryCount) * 100)
    : 0;

  const categoryLabel = ranking
    ? [
        GRADE_LABELS[ranking.grade] ?? ranking.grade,
        AGE_RANGE_LABELS[ranking.ageRange] ?? ranking.ageRange,
        WEIGHT_LABELS[ranking.weightCategory] ?? ranking.weightCategory,
      ].join(" · ")
    : "";

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
        Mi Ranking
      </h1>

      {!ranking ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-12 text-center space-y-2">
          <Trophy className="w-10 h-10 text-neutral-700 mx-auto" />
          <p className="text-neutral-500 text-sm">
            Sin datos de ranking disponibles.
          </p>
          <p className="text-neutral-600 text-xs">
            El ranking se calcula al registrar resultados de competencias.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Main ranking card ─────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 space-y-5">
              {/* Position hero */}
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 shrink-0">
                  <span className="text-4xl font-black text-yellow-400 tracking-tighter leading-none">
                    #{ranking.position}
                  </span>
                </div>
                <div>
                  <p className="text-neutral-200 font-semibold">
                    {ranking.categoryCount} practicantes en tu categoría
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {categoryLabel}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-sm font-bold text-yellow-400">
                      {ranking.totalPoints}
                    </span>
                    <span className="text-xs text-neutral-500">puntos</span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Posición en categoría</span>
                  <span className="text-neutral-400">
                    Top {positionPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-700"
                    style={{ width: `${positionPercent}%` }}
                  />
                </div>
              </div>

              {/* Metadata grid */}
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1 border-t border-neutral-800">
                <div>
                  <dt className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-0.5">
                    Grado
                  </dt>
                  <dd className="text-sm text-neutral-200">
                    {GRADE_LABELS[ranking.grade] ?? ranking.grade}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-0.5">
                    Categoría edad
                  </dt>
                  <dd className="text-sm text-neutral-200">
                    {AGE_RANGE_LABELS[ranking.ageRange] ?? ranking.ageRange}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-0.5">
                    Peso
                  </dt>
                  <dd className="text-sm text-neutral-200">
                    {WEIGHT_LABELS[ranking.weightCategory] ??
                      ranking.weightCategory}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-0.5">
                    Última actualización
                  </dt>
                  <dd className="text-xs text-neutral-400">
                    {formatDate(ranking.calculatedAt)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* ── Leaderboard top 10 ──────────────────────────────── */}
            {top10Slice.length > 0 && (
              <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-yellow-400/10 flex items-center justify-center">
                    <Medal className="w-3.5 h-3.5 text-yellow-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-neutral-100">
                    Top 10 — {categoryLabel}
                  </h2>
                </div>
                <ul className="divide-y divide-neutral-800">
                  {top10Slice.map((entry, idx) => {
                    const isSelf = entry.practitionerId === practitioner.id;
                    const position = idx + 1;
                    const medalColors: Record<number, string> = {
                      1: "text-yellow-400",
                      2: "text-neutral-300",
                      3: "text-amber-600",
                    };
                    const posColor =
                      medalColors[position] ?? "text-neutral-500";

                    return (
                      <li
                        key={entry.id}
                        className={`flex items-center gap-4 px-5 py-3 ${
                          isSelf
                            ? "bg-yellow-400/5 border-l-2 border-yellow-400"
                            : "hover:bg-neutral-800/30 transition-colors"
                        }`}
                      >
                        {/* Position */}
                        <span
                          className={`w-6 text-center text-sm font-bold tabular-nums shrink-0 ${posColor}`}
                        >
                          {position}
                        </span>

                        {/* Name */}
                        <span
                          className={`flex-1 text-sm truncate ${
                            isSelf
                              ? "text-yellow-200 font-semibold"
                              : "text-neutral-300"
                          }`}
                        >
                          {isSelf
                            ? `${practitioner.fullName} (tú)`
                            : (nameMap.get(entry.practitionerId) ?? "—")}
                        </span>

                        {/* Points */}
                        <span className="text-sm font-bold text-neutral-200 tabular-nums shrink-0">
                          {entry.totalPoints}
                          <span className="text-xs font-normal text-neutral-600 ml-1">
                            pts
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {categoryTop10.length > 10 && (
                  <div className="px-5 py-3 border-t border-neutral-800">
                    <p className="text-xs text-neutral-600">
                      Mostrando top 10 de {ranking.categoryCount} practicantes
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Historial mensual ─────────────────────────────────── */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-neutral-50">
              Evolución mensual
            </h2>
            {snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Trophy className="w-8 h-8 text-neutral-700" />
                <p className="text-neutral-500 text-sm text-center">
                  Sin historial de posiciones aún.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {snapshots.slice(0, 8).map((snap, idx) => {
                  const prev = snapshots[idx + 1];
                  const delta = prev ? prev.position - snap.position : null;
                  return (
                    <li
                      key={snap.id}
                      className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0"
                    >
                      <span className="text-xs text-neutral-400">
                        {snap.periodLabel}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-semibold text-neutral-100">
                          #{snap.position}
                        </span>
                        {delta !== null && delta !== 0 && (
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              delta > 0
                                ? "text-emerald-400 bg-emerald-400/10"
                                : "text-rose-400 bg-rose-400/10"
                            }`}
                          >
                            {delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`}
                          </span>
                        )}
                        <span className="text-xs text-neutral-600 tabular-nums w-16 text-right">
                          {snap.totalPoints} pts
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

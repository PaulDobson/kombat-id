import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleChargeRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleChargeRepository";
import type { Grade } from "@/modules/practitioner-identity/domain/entities/practitioner";
import Link from "next/link";

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

const GRADE_LABELS: Record<Grade, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

export default async function AdminChargesPage() {
  await requireAdminUser();

  const practitionerRepo = new DrizzlePractitionerRepository();
  const chargeRepo = new DrizzleChargeRepository();

  const practitioners = await practitionerRepo.search({});

  // Fetch charge counts per practitioner in parallel
  const chargeCountsRaw = await Promise.all(
    practitioners.map(async (p) => {
      const charges = await chargeRepo.findByPractitioner(p.id);
      const pendingCount = charges.filter(
        (c) => c.status === "pendiente",
      ).length;
      const overdueCount = charges.filter((c) => c.status === "vencido").length;
      return {
        practitionerId: p.id,
        pendingCount,
        overdueCount,
        totalCount: charges.length,
      };
    }),
  );

  const chargeCountsMap = new Map(
    chargeCountsRaw.map((c) => [c.practitionerId, c]),
  );

  const totalPending = chargeCountsRaw.reduce(
    (sum, c) => sum + c.pendingCount,
    0,
  );
  const totalOverdue = chargeCountsRaw.reduce(
    (sum, c) => sum + c.overdueCount,
    0,
  );
  const practitionersWithIssues = chargeCountsRaw.filter(
    (c) => c.pendingCount > 0 || c.overdueCount > 0,
  ).length;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Gestión Económica
        </h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          Resumen de cobros por practicante
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
            Cobros pendientes
          </p>
          <p className="text-3xl font-bold text-amber-400">{totalPending}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
            Cobros vencidos
          </p>
          <p className="text-3xl font-bold text-rose-400">{totalOverdue}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
            Practicantes con deuda
          </p>
          <p className="text-3xl font-bold text-neutral-50">
            {practitionersWithIssues}
          </p>
        </div>
      </div>

      {/* Practitioners table */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        {practitioners.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-500 text-sm">
              No hay practicantes registrados.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                  RUT
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                  Grado
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Pendientes
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Vencidos
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {practitioners.map((p) => {
                const counts = chargeCountsMap.get(p.id);
                const hasPending = (counts?.pendingCount ?? 0) > 0;
                const hasOverdue = (counts?.overdueCount ?? 0) > 0;

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-neutral-100 font-medium">
                      {p.fullName}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 tabular-nums hidden sm:table-cell">
                      {p.rut}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-neutral-300 text-xs">
                        {GRADE_LABELS[p.grade]}
                        {p.dan ? ` ${p.dan}° Dan` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {hasPending ? (
                        <span className="bg-amber-900/50 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-full text-xs">
                          {counts?.pendingCount}
                        </span>
                      ) : (
                        <span className="text-neutral-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasOverdue ? (
                        <span className="bg-rose-900/50 text-rose-400 border border-rose-800 px-2 py-0.5 rounded-full text-xs">
                          {counts?.overdueCount}
                        </span>
                      ) : (
                        <span className="text-neutral-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/charges/${p.id}`}
                        className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
                      >
                        Ver cobros
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {practitioners.length > 0 && (
        <p className="text-xs text-neutral-600 mt-3 text-right">
          {practitioners.length} practicante
          {practitioners.length !== 1 ? "s" : ""}
        </p>
      )}
    </main>
  );
}

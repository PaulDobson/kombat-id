import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleChargeRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleChargeRepository";
import { getPractitionerEconomicSummary } from "@/modules/practitioner-identity/application/use-cases/getPractitionerEconomicSummary";
import type {
  ChargeStatus,
  ChargeType,
} from "@/modules/practitioner-identity/domain/entities/charge";
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

const CHARGE_TYPE_LABELS: Record<ChargeType, string> = {
  examen_grado: "Examen de grado",
  membresia_anual: "Membresía anual",
  licencia_competencia: "Licencia de competencia",
};

const STATUS_STYLES: Record<ChargeStatus, string> = {
  pendiente: "bg-amber-900/50 text-amber-400 border border-amber-800",
  pagado: "bg-emerald-900/50 text-emerald-400 border border-emerald-800",
  vencido: "bg-rose-900/50 text-rose-400 border border-rose-800",
  exento: "bg-neutral-800 text-neutral-400 border border-neutral-700",
};

const STATUS_LABELS: Record<ChargeStatus, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  vencido: "Vencido",
  exento: "Exento",
};

import { formatDateNumeric } from "@/lib/format-date";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return formatDateNumeric(dateStr);
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function PractitionerChargesPage({
  params,
}: {
  params: Promise<{ practitionerId: string }>;
}) {
  await requireAdminUser();

  const { practitionerId } = await params;

  const practitionerRepo = new DrizzlePractitionerRepository();
  const chargeRepo = new DrizzleChargeRepository();

  const practitioner = await practitionerRepo.findById(practitionerId);
  if (!practitioner) notFound();

  const summary = await getPractitionerEconomicSummary(
    { practitionerId: practitioner.id },
    { chargeRepo },
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        href="/admin/charges"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 transition-colors mb-6"
      >
        ← Volver al resumen económico
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            {practitioner.fullName}
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            RUT: {practitioner.rut}
          </p>
        </div>
        {!practitioner.isActive && (
          <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
            Inactivo
          </span>
        )}
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
            Pendientes
          </p>
          <p className="text-2xl font-bold text-amber-400">
            {summary.pendingCount}
          </p>
        </div>
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
            Vencidos
          </p>
          <p className="text-2xl font-bold text-rose-400">
            {summary.overdueCount}
          </p>
        </div>
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
            Pagados
          </p>
          <p className="text-2xl font-bold text-emerald-400">
            {summary.paidCount}
          </p>
        </div>
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
            Exentos
          </p>
          <p className="text-2xl font-bold text-neutral-300">
            {summary.exemptCount}
          </p>
        </div>
      </div>

      {/* Charges list */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-700">
          <h2 className="text-sm font-medium text-neutral-200">
            Cobros ({summary.charges.length})
          </h2>
        </div>

        {summary.charges.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-500 text-sm">
              Este practicante no tiene cobros registrados.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Monto
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                  Vencimiento
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                  Período
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                  Pagado el
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {summary.charges.map((charge) => (
                <tr
                  key={charge.id}
                  className="hover:bg-neutral-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-neutral-200">
                    {CHARGE_TYPE_LABELS[charge.chargeType]}
                  </td>
                  <td className="px-4 py-3 text-neutral-100 tabular-nums font-medium">
                    {formatAmount(charge.amount, charge.currency)}
                  </td>
                  <td className="px-4 py-3 text-neutral-400 tabular-nums hidden sm:table-cell">
                    {formatDate(charge.dueDate)}
                  </td>
                  <td className="px-4 py-3 text-neutral-400 text-xs hidden md:table-cell">
                    {formatDate(charge.periodStart)} –{" "}
                    {formatDate(charge.periodEnd)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[charge.status]}`}
                    >
                      {STATUS_LABELS[charge.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-400 tabular-nums hidden md:table-cell">
                    {charge.paidAt ? (
                      <span>{formatDate(charge.paidAt)}</span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {summary.charges.some((c) => c.exemptionReason) && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            Notas de exención
          </p>
          {summary.charges
            .filter((c) => c.exemptionReason)
            .map((c) => (
              <div
                key={c.id}
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm"
              >
                <span className="text-neutral-400">
                  {CHARGE_TYPE_LABELS[c.chargeType]}:
                </span>{" "}
                <span className="text-neutral-200">{c.exemptionReason}</span>
              </div>
            ))}
        </div>
      )}
    </main>
  );
}

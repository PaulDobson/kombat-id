import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { DrizzleAcademyRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleAcademyRepository";
import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";
import type { Grade } from "@/modules/practitioner-identity/domain/entities/practitioner";
import { isInstructorRole } from "@/lib/roles";
import Link from "next/link";
import { RemoveMemberButton } from "./RemoveMemberButton";
import { EditAcademyForm } from "./EditAcademyForm";
import { RegisterStudentSection } from "./RegisterStudentSection";
import { EditStudentModal } from "./EditStudentModal";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Settings2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 7;

const REGION_LABELS: Record<ChileanRegion, string> = {
  arica_y_parinacota: "Arica y Parinacota",
  tarapaca: "Tarapacá",
  antofagasta: "Antofagasta",
  atacama: "Atacama",
  coquimbo: "Coquimbo",
  valparaiso: "Valparaíso",
  metropolitana: "Metropolitana",
  ohiggins: "O'Higgins",
  maule: "Maule",
  nuble: "Ñuble",
  biobio: "Biobío",
  araucania: "Araucanía",
  los_rios: "Los Ríos",
  los_lagos: "Los Lagos",
  aysen: "Aysén",
  magallanes: "Magallanes",
};

const GRADE_LABELS: Record<Grade, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

const GRADE_STYLES: Record<Grade, string> = {
  white: "bg-neutral-700 text-neutral-200 border border-neutral-600",
  yellow: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/25",
  green: "bg-green-500/10 text-green-400 border border-green-500/25",
  blue: "bg-blue-500/10 text-blue-400 border border-blue-500/25",
  red: "bg-red-500/10 text-red-400 border border-red-500/25",
  black: "bg-neutral-800 text-neutral-100 border border-neutral-600",
};

const GRADE_BAR_COLOR: Record<Grade, string> = {
  white: "bg-neutral-400",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  red: "bg-red-500",
  black: "bg-neutral-800",
};

const GRADE_ORDER: Grade[] = [
  "white",
  "yellow",
  "green",
  "blue",
  "red",
  "black",
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function InstructorAcademyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ academyId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const { academyId } = await params;
  const sp = await searchParams;

  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!practitioner || !isInstructorRole(practitioner.role as string)) {
    redirect("/instructor");
  }

  const practitionerId = practitioner.id as string;

  const academyRepo = new DrizzleAcademyRepository();
  const academy = await academyRepo.findById(academyId);

  if (!academy) notFound();
  if (!academy.responsibleInstructorIds.includes(practitionerId)) {
    redirect("/instructor");
  }

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  // ── Paginated members ────────────────────────────────────────────────────
  const { data: memberRows, count: memberCount } = await adminSupabase
    .from("academy_memberships")
    .select(
      "practitioner_id, practitioners(id, full_name, rut, grade, dan, address_city, address_street, address_region, weight_kg, height_cm, contact_phone, contact_email, is_active)",
      { count: "exact" },
    )
    .eq("academy_id", academyId)
    .eq("is_active", true)
    .order("practitioner_id")
    .range(offset, offset + PAGE_SIZE - 1);

  // ── Stats: grade distribution + active count ─────────────────────────────
  const { data: statsRows } = await adminSupabase
    .from("academy_memberships")
    .select("practitioners(grade, is_active)")
    .eq("academy_id", academyId)
    .eq("is_active", true);

  const gradeCounts: Partial<Record<Grade, number>> = {};
  let activeCount = 0;
  for (const row of statsRows ?? []) {
    const p = (
      row as { practitioners: { grade: string; is_active: boolean } | null }
    ).practitioners;
    if (!p) continue;
    const g = p.grade as Grade;
    gradeCounts[g] = (gradeCounts[g] ?? 0) + 1;
    if (p.is_active) activeCount++;
  }

  const totalMemberCount = memberCount ?? 0;
  const totalStatsCount = (statsRows ?? []).length;
  const totalPages = Math.ceil(totalMemberCount / PAGE_SIZE);

  type MemberRow = {
    practitioner_id: string;
    practitioners: {
      id: string;
      full_name: string;
      rut: string;
      grade: string;
      dan: number | null;
      address_city: string | null;
      address_street: string | null;
      address_region: string | null;
      weight_kg: number | null;
      height_cm: number | null;
      contact_phone: string | null;
      contact_email: string | null;
      is_active: boolean;
    } | null;
  };

  const members = (memberRows ?? [])
    .map((r) => (r as MemberRow).practitioners)
    .filter(Boolean) as NonNullable<MemberRow["practitioners"]>[];

  const pageUrl = (p: number) => `/instructor/academies/${academyId}?page=${p}`;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Link
          href="/instructor"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al panel
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-semibold text-neutral-50 tracking-tight">
                  {academy.name}
                </h1>
                {academy.isActive ? (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Activa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-neutral-800 text-neutral-400 border border-neutral-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                    Inactiva
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5">
                <MapPin className="w-3 h-3" />
                {academy.city}
                {academy.region
                  ? `, ${REGION_LABELS[academy.region] ?? academy.region}`
                  : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-50 tabular-nums">
              {totalStatsCount}
            </p>
            <p className="text-xs text-neutral-500">Miembros</p>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-50 tabular-nums">
              {activeCount}
            </p>
            <p className="text-xs text-neutral-500">Activos</p>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
            <UserX className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-50 tabular-nums">
              {totalStatsCount - activeCount}
            </p>
            <p className="text-xs text-neutral-500">Inactivos</p>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-700/60 flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4 text-neutral-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-100">
              {academy.foundedDate ?? "—"}
            </p>
            <p className="text-xs text-neutral-500">Fundada</p>
          </div>
        </div>
      </div>

      {/* ── Grade distribution ────────────────────────────────────────────── */}
      {totalStatsCount > 0 && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Distribución por grado
          </p>
          {/* Stacked bar */}
          <div className="flex h-3 rounded-full overflow-hidden gap-px">
            {GRADE_ORDER.map((g) => {
              const count = gradeCounts[g] ?? 0;
              if (count === 0) return null;
              const pct = (count / totalStatsCount) * 100;
              return (
                <div
                  key={g}
                  className={`${GRADE_BAR_COLOR[g]} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${GRADE_LABELS[g]}: ${count}`}
                />
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {GRADE_ORDER.map((g) => {
              const count = gradeCounts[g] ?? 0;
              if (count === 0) return null;
              return (
                <div
                  key={g}
                  className="flex items-center gap-1.5 text-xs text-neutral-400"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-sm ${GRADE_BAR_COLOR[g]}`}
                  />
                  {GRADE_LABELS[g]}
                  <span className="text-neutral-500 tabular-nums">
                    ({count})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Info + Edit ───────────────────────────────────────────────────── */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-neutral-700/60 flex items-center justify-center">
            <Settings2 className="w-4 h-4 text-neutral-400" />
          </div>
          <h2 className="text-sm font-semibold text-neutral-100">
            Datos de la academia
          </h2>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div className="space-y-0.5">
            <dt className="text-xs text-neutral-500">Región</dt>
            <dd className="text-neutral-200 font-medium">
              {REGION_LABELS[academy.region] ?? academy.region}
            </dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-xs text-neutral-500">Ciudad</dt>
            <dd className="text-neutral-200 font-medium">{academy.city}</dd>
          </div>
          {academy.address && (
            <div className="space-y-0.5 col-span-2 sm:col-span-1">
              <dt className="text-xs text-neutral-500">Dirección</dt>
              <dd className="text-neutral-200 font-medium">
                {academy.address}
              </dd>
            </div>
          )}
        </dl>
        <div className="border-t border-neutral-800 pt-5">
          <p className="text-xs font-medium text-neutral-400 mb-4">
            Editar datos
          </p>
          <EditAcademyForm
            academyId={academyId}
            name={academy.name}
            city={academy.city}
            address={academy.address}
            foundedDate={academy.foundedDate}
          />
        </div>
      </div>

      {/* ── Members table ─────────────────────────────────────────────────── */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                Practicantes
              </h2>
              <p className="text-xs text-neutral-500">
                {totalMemberCount.toLocaleString("es-CL")} registro
                {totalMemberCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {academy.isActive && <RegisterStudentSection academyId={academyId} />}
        </div>

        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center">
              <Users className="w-6 h-6 text-neutral-600" />
            </div>
            <p className="text-neutral-500 text-sm">
              Sin practicantes activos en esta academia.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/80">
                    <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider hidden sm:table-cell">
                      RUT
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Grado
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                      Comuna
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider hidden lg:table-cell">
                      Estado
                    </th>
                    <th className="px-5 py-3 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {members.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-neutral-800/40 transition-colors group"
                    >
                      <td className="px-5 py-3 text-neutral-100 font-medium">
                        {p.full_name}
                      </td>
                      <td className="px-5 py-3 text-neutral-400 tabular-nums text-xs hidden sm:table-cell">
                        {p.rut}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${GRADE_STYLES[p.grade as Grade]}`}
                        >
                          {GRADE_LABELS[p.grade as Grade]}
                          {p.dan ? ` ${p.dan}° Dan` : ""}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-neutral-400 text-xs hidden md:table-cell">
                        {p.address_city ?? (
                          <span className="text-neutral-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-neutral-800 text-neutral-400 border border-neutral-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <EditStudentModal
                            student={{
                              id: p.id,
                              fullName: p.full_name,
                              weightKg: p.weight_kg,
                              heightCm: p.height_cm,
                              contactPhone: p.contact_phone,
                              contactEmail: p.contact_email,
                              addressStreet: p.address_street,
                              addressCity: p.address_city,
                              addressRegion: p.address_region,
                            }}
                          />
                          {academy.isActive && (
                            <RemoveMemberButton
                              academyId={academyId}
                              practitionerId={p.id}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800">
                <p className="text-xs text-neutral-500">
                  Página {page} de {totalPages} ·{" "}
                  {totalMemberCount.toLocaleString("es-CL")} registros
                </p>
                <div className="flex items-center gap-1">
                  {page > 1 && (
                    <Link
                      href={pageUrl(page - 1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                    </Link>
                  )}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(
                      1,
                      Math.min(page - 2, totalPages - 4),
                    );
                    const p2 = start + i;
                    return (
                      <Link
                        key={p2}
                        href={pageUrl(p2)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                          p2 === page
                            ? "bg-primary-600 border-primary-600 text-white"
                            : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300"
                        }`}
                      >
                        {p2}
                      </Link>
                    );
                  })}
                  {page < totalPages && (
                    <Link
                      href={pageUrl(page + 1)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
                    >
                      Siguiente <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}


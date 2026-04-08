import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { DrizzleAcademyRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleAcademyRepository";
import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";
import type { Grade } from "@/modules/practitioner-identity/domain/entities/practitioner";
import Link from "next/link";
import { DeactivateAcademyButton } from "./DeactivateAcademyButton";
import { AssignPractitionerPanel } from "./AssignPractitionerPanel";
import { RemoveMemberButton } from "./RemoveMemberButton";
import { ManageInstructorsPanel } from "./ManageInstructorsPanel";

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

const PAGE_SIZE = 10;

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
  yellow: "bg-yellow-900/50 text-yellow-400 border border-yellow-800",
  green: "bg-green-900/50 text-green-400 border border-green-800",
  blue: "bg-blue-900/50 text-blue-400 border border-blue-800",
  red: "bg-red-900/50 text-red-400 border border-red-800",
  black: "bg-neutral-800 text-neutral-100 border border-neutral-600",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AcademyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ academyId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminUser();
  const { academyId } = await params;
  const sp = await searchParams;

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const academyRepo = new DrizzleAcademyRepository();

  const academy = await academyRepo.findById(academyId);
  if (!academy) notFound();

  // ── Paginated members query ───────────────────────────────────────────────
  // Join academy_memberships → practitioners in a single round-trip
  const { data: memberRows, count: memberCount } = await adminSupabase
    .from("academy_memberships")
    .select(
      "practitioner_id, practitioners(id, full_name, rut, grade, dan, address_city, is_active)",
      { count: "exact" },
    )
    .eq("academy_id", academyId)
    .eq("is_active", true)
    .order("practitioner_id")
    .range(offset, offset + PAGE_SIZE - 1);

  const totalMemberCount = memberCount ?? 0;
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
      is_active: boolean;
    } | null;
  };

  const members = (memberRows ?? [])
    .map((r) => (r as MemberRow).practitioners)
    .filter(Boolean) as NonNullable<MemberRow["practitioners"]>[];

  // ── Instructors: current + available to add ───────────────────────────────
  const { data: allInstructorRows } = await adminSupabase
    .from("practitioners")
    .select("id, full_name, rut, role")
    .in("role", ["instructor", "profesor", "maestro"])
    .eq("is_active", true)
    .order("full_name")
    .limit(500);

  type InstructorRow = {
    id: string;
    full_name: string;
    rut: string;
    role: string;
  };

  const currentInstructorIds = new Set(academy.responsibleInstructorIds);

  const currentInstructors = (allInstructorRows ?? [])
    .filter((r) => currentInstructorIds.has((r as InstructorRow).id))
    .map((r) => ({
      id: (r as InstructorRow).id,
      fullName: (r as InstructorRow).full_name,
      rut: (r as InstructorRow).rut,
      role: (r as InstructorRow).role,
    }));

  const availableInstructors = (allInstructorRows ?? [])
    .filter((r) => !currentInstructorIds.has((r as InstructorRow).id))
    .map((r) => ({
      id: (r as InstructorRow).id,
      fullName: (r as InstructorRow).full_name,
      rut: (r as InstructorRow).rut,
      role: (r as InstructorRow).role,
    }));

  // ── Available practitioners (not in any active membership) ────────────────
  const { data: allActiveMemberships } = await adminSupabase
    .from("academy_memberships")
    .select("practitioner_id")
    .eq("is_active", true);

  const alreadyAssigned = [
    ...new Set(
      (allActiveMemberships ?? []).map((m) => m.practitioner_id as string),
    ),
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let availableQuery: any = adminSupabase
    .from("practitioners")
    .select("id, full_name, rut, grade")
    .eq("is_active", true)
    .order("full_name")
    .limit(500);

  if (alreadyAssigned.length > 0) {
    availableQuery = availableQuery.not("id", "in", alreadyAssigned);
  }

  const { data: availableRows } = await availableQuery;

  const available = (availableRows ?? []).map(
    (p: { id: string; full_name: string; rut: string; grade: string }) => ({
      id: p.id,
      fullName: p.full_name,
      rut: p.rut,
      grade: p.grade,
    }),
  );

  // ── Pagination URL helper ─────────────────────────────────────────────────
  const pageUrl = (p: number) => `/admin/academies/${academyId}?page=${p}`;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/academies"
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver al listado
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-semibold text-neutral-50 tracking-tight">
            {academy.name}
          </h1>
          {academy.isActive ? (
            <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full text-xs">
              Activa
            </span>
          ) : (
            <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
              Inactiva
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-neutral-50 mb-4">
          Datos de la academia
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Región
            </dt>
            <dd className="text-neutral-200">
              {REGION_LABELS[academy.region] ?? academy.region}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Ciudad
            </dt>
            <dd className="text-neutral-200">{academy.city}</dd>
          </div>
          {academy.address && (
            <div className="col-span-2">
              <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                Dirección
              </dt>
              <dd className="text-neutral-200">{academy.address}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Practicantes activos
            </dt>
            <dd className="text-2xl font-bold text-primary-400">
              {totalMemberCount}
            </dd>
          </div>
          {academy.foundedDate && (
            <div>
              <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                Fundada
              </dt>
              <dd className="text-neutral-200">{academy.foundedDate}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Instructors */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-neutral-50 mb-4">
          Instructores responsables
        </h2>
        <ManageInstructorsPanel
          academyId={academyId}
          current={currentInstructors}
          available={academy.isActive ? availableInstructors : []}
        />
      </div>

      {/* Members table */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-50">
            Practicantes
          </h2>
          <span className="text-xs text-neutral-400">
            {totalMemberCount.toLocaleString("es-CL")} registros
          </span>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-neutral-500 text-sm">
              Sin practicantes activos en esta academia.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      RUT
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Grado
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      Ciudad
                    </th>
                    <th className="px-5 py-3 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {members.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-neutral-800/50 transition-colors"
                    >
                      <td className="px-5 py-3 text-neutral-100 font-medium">
                        {p.full_name}
                      </td>
                      <td className="px-5 py-3 text-neutral-400 tabular-nums text-xs hidden sm:table-cell">
                        {p.rut}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${GRADE_STYLES[p.grade as Grade]}`}
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
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/practitioners/${p.id}`}
                            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                          >
                            Ver
                          </Link>
                          {academy.isActive && (
                            <RemoveMemberButton practitionerId={p.id} />
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
              <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-700">
                <p className="text-xs text-neutral-500">
                  Página {page} de {totalPages} ·{" "}
                  {totalMemberCount.toLocaleString("es-CL")} registros
                </p>
                <div className="flex items-center gap-1">
                  {page > 1 && (
                    <Link
                      href={pageUrl(page - 1)}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
                    >
                      ← Anterior
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
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
                    >
                      Siguiente →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Assign panel */}
      {academy.isActive && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-neutral-50">
            Agregar practicante
          </h2>
          <p className="text-xs text-neutral-500">
            Solo se muestran practicantes que no pertenecen a ninguna academia
            activa.
          </p>
          <AssignPractitionerPanel
            academyId={academyId}
            available={available}
          />
        </div>
      )}

      {/* Deactivate */}
      {academy.isActive && (
        <div className="bg-neutral-900 border border-rose-500/20 rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-rose-400">
            Zona de peligro
          </h2>
          <DeactivateAcademyButton academyId={academyId} />
        </div>
      )}
    </main>
  );
}

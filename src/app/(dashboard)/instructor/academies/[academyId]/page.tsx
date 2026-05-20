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
  yellow: "bg-yellow-900/50 text-yellow-400 border border-yellow-800",
  green: "bg-green-900/50 text-green-400 border border-green-800",
  blue: "bg-blue-900/50 text-blue-400 border border-blue-800",
  red: "bg-red-900/50 text-red-400 border border-red-800",
  black: "bg-neutral-800 text-neutral-100 border border-neutral-600",
};

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

  // Verify the user is an instructor
  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!practitioner || !isInstructorRole(practitioner.role as string)) {
    redirect("/instructor");
  }

  const practitionerId = practitioner.id as string;

  // Load the academy and verify this instructor is responsible for it
  const academyRepo = new DrizzleAcademyRepository();
  const academy = await academyRepo.findById(academyId);

  if (!academy) notFound();
  if (!academy.responsibleInstructorIds.includes(practitionerId)) {
    redirect("/instructor");
  }

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  // ── Paginated members ─────────────────────────────────────────────────────
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
      {/* Header */}
      <div>
        <Link
          href="/instructor"
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver al panel
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
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-6">
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

        {/* Edit form */}
        <div className="border-t border-neutral-700 pt-5">
          <h3 className="text-sm font-medium text-neutral-300 mb-4">
            Editar datos
          </h3>
          <EditAcademyForm
            academyId={academyId}
            name={academy.name}
            city={academy.city}
            address={academy.address}
            foundedDate={academy.foundedDate}
          />
        </div>
      </div>

      {/* Members table */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-50">
            Practicantes
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-400">
              {totalMemberCount.toLocaleString("es-CL")} registros
            </span>
            {academy.isActive && (
              <RegisterStudentSection academyId={academyId} />
            )}
          </div>
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
    </main>
  );
}

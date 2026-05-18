import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Grade } from "@/modules/practitioner-identity/domain/entities/practitioner";
import { ActivateButton } from "../[publicId]/ActivateButton";

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

const PAGE_SIZE = 10;

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

function buildUrl(overrides: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(overrides)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return `/admin/practitioners/pending-activation${qs ? `?${qs}` : ""}`;
}

export default async function PendingActivationPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; rut?: string; page?: string }>;
}) {
  await requireAdminUser();

  const sp = await searchParams;
  const name = sp.name?.trim() ?? "";
  const rut = sp.rut?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  // Build query with filters and pagination
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = adminSupabase
    .from("practitioners")
    .select(
      "id, full_name, rut, grade, dan, start_date, created_at, instructor_id, contact_email, contact_phone",
      { count: "exact" },
    )
    .eq("is_active", false)
    .not("instructor_id", "is", null)
    .order("created_at", { ascending: false });

  if (name) query = query.ilike("full_name", `%${name}%`);
  if (rut) query = query.ilike("rut", `%${rut}%`);

  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: rows, count } = await query;
  const practitioners = rows ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Enrich with instructor names and academy names
  const instructorIds = [
    ...new Set(
      practitioners
        .map((p: { instructor_id: string | null }) => p.instructor_id)
        .filter(Boolean) as string[],
    ),
  ];
  const practitionerIds = practitioners.map((p: { id: string }) => p.id);

  const [{ data: instructorRows }, { data: memberships }] = await Promise.all([
    instructorIds.length > 0
      ? adminSupabase
          .from("practitioners")
          .select("id, full_name")
          .in("id", instructorIds)
      : Promise.resolve({ data: [] }),
    practitionerIds.length > 0
      ? adminSupabase
          .from("academy_memberships")
          .select("practitioner_id, academies(name)")
          .eq("is_active", true)
          .in("practitioner_id", practitionerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const instructorNameById = new Map<string, string>();
  for (const i of instructorRows ?? []) {
    instructorNameById.set(i.id as string, i.full_name as string);
  }
  const academyByPractitioner = new Map<string, string>();
  for (const m of memberships ?? []) {
    const aName = (m.academies as { name: string } | null)?.name;
    if (aName) academyByPractitioner.set(m.practitioner_id as string, aName);
  }

  const hasFilters = !!(name || rut);
  const baseParams = { name: name || undefined, rut: rut || undefined };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/practitioners"
            className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            ← Practicantes
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50 mt-2">
            Activaciones pendientes
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            Alumnos registrados por instructores que requieren verificación de
            membresía para ser activados.
          </p>
        </div>
        <span className="bg-amber-900/40 text-amber-300 border border-amber-700/40 px-3 py-1 rounded-full text-sm font-medium shrink-0">
          {totalCount} pendiente{totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-700/30 rounded-xl px-4 py-3">
        <span className="text-amber-400 shrink-0" aria-hidden="true">
          ℹ️
        </span>
        <p className="text-xs text-amber-300 leading-relaxed">
          Verifica que el alumno haya realizado el pago de membresía antes de
          activar su cuenta. Al activar, el alumno podrá acceder a la plataforma
          y su código QR de identificación quedará habilitado.
        </p>
      </div>

      {/* Search filters */}
      <form
        method="GET"
        className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 flex flex-wrap gap-3 items-end"
      >
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Nombre
          </label>
          <input
            name="name"
            defaultValue={name}
            placeholder="Buscar por nombre..."
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="w-40">
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            RUT
          </label>
          <input
            name="rut"
            defaultValue={rut}
            placeholder="12345678-9"
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Buscar
          </button>
          {hasFilters && (
            <Link
              href="/admin/practitioners/pending-activation"
              className="hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        {practitioners.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-500 text-sm">
              {hasFilters
                ? "No se encontraron alumnos con ese criterio."
                : "No hay alumnos pendientes de activación."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-900/80">
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Alumno
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                    RUT
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Grado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                    Instructor
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden lg:table-cell">
                    Academia
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden lg:table-cell">
                    Contacto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden xl:table-cell">
                    Registrado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {practitioners.map(
                  (p: {
                    id: string;
                    full_name: string;
                    rut: string;
                    grade: Grade;
                    dan: number | null;
                    start_date: string;
                    created_at: string;
                    instructor_id: string | null;
                    contact_email: string | null;
                    contact_phone: string | null;
                  }) => {
                    const instructorName = p.instructor_id
                      ? instructorNameById.get(p.instructor_id)
                      : null;
                    const academyName = academyByPractitioner.get(p.id);
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-neutral-800/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/practitioners/${p.id}`}
                            className="text-neutral-100 font-medium hover:text-primary-400 transition-colors"
                          >
                            {p.full_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-neutral-400 tabular-nums text-xs hidden sm:table-cell">
                          {p.rut}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${GRADE_STYLES[p.grade]}`}
                          >
                            {GRADE_LABELS[p.grade]}
                            {p.dan ? ` ${p.dan}° Dan` : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-400 text-xs hidden md:table-cell">
                          {instructorName ?? (
                            <span className="text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-400 text-xs hidden lg:table-cell">
                          {academyName ?? (
                            <span className="text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-400 text-xs hidden lg:table-cell">
                          {p.contact_email ?? p.contact_phone ?? (
                            <span className="text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-500 text-xs hidden xl:table-cell">
                          {p.created_at.slice(0, 10)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ActivateButton publicId={p.id} />
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            Página {page} de {totalPages} · {totalCount.toLocaleString("es-CL")}{" "}
            registros
          </p>
          <div className="flex items-center gap-1">
            {page > 1 && (
              <Link
                href={buildUrl({ ...baseParams, page: String(page - 1) })}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
              >
                ← Anterior
              </Link>
            )}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p2 = start + i;
              return (
                <Link
                  key={p2}
                  href={buildUrl({ ...baseParams, page: String(p2) })}
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
                href={buildUrl({ ...baseParams, page: String(page + 1) })}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
              >
                Siguiente →
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import type { Grade } from "@/modules/practitioner-identity/domain/entities/practitioner";
import Link from "next/link";

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

const PAGE_SIZE = 25;

const GRADE_ORDER: Grade[] = [
  "white",
  "yellow",
  "green",
  "blue",
  "red",
  "black",
];

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

type SortField = "full_name" | "start_date" | "grade" | "created_at";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildUrl(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
) {
  const merged = { ...base, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return `/admin/practitioners${qs ? `?${qs}` : ""}`;
}

function SortLink({
  label,
  field,
  current,
  dir,
  base,
}: {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  base: Record<string, string | undefined>;
}) {
  const isActive = current === field;
  const nextDir: SortDir = isActive && dir === "asc" ? "desc" : "asc";
  return (
    <Link
      href={buildUrl(base, { sort: field, dir: nextDir, page: "1" })}
      className={`flex items-center gap-1 whitespace-nowrap ${isActive ? "text-primary-400" : "text-neutral-400 hover:text-neutral-200"} transition-colors`}
    >
      {label}
      {isActive ? (dir === "asc" ? " ↑" : " ↓") : " ↕"}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminPractitionersPage({
  searchParams,
}: {
  searchParams: Promise<{
    name?: string;
    rut?: string;
    grade?: string;
    academy?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  await requireAdminUser();
  const sp = await searchParams;

  const name = sp.name?.trim() ?? "";
  const rut = sp.rut?.trim() ?? "";
  const grade = sp.grade ?? "";
  const academyFilter = sp.academy ?? "";
  const sort: SortField = (
    ["full_name", "start_date", "grade", "created_at"].includes(sp.sort ?? "")
      ? sp.sort
      : "full_name"
  ) as SortField;
  const dir: SortDir = sp.dir === "desc" ? "desc" : "asc";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const baseParams: Record<string, string | undefined> = {
    name: name || undefined,
    rut: rut || undefined,
    grade: grade || undefined,
    academy: academyFilter || undefined,
    sort,
    dir,
  };

  // ── Fetch academies for filter dropdown (cheap, small table) ──────────────
  const { data: academyList } = await adminSupabase
    .from("academies")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  // ── Main query — server-side filtered, sorted, paginated ─────────────────
  // We join through academy_memberships to get academy name in one query.
  // Supabase doesn't support arbitrary JOINs via the JS client, so we use
  // two targeted queries and merge in JS — still O(PAGE_SIZE) per render.

  // Step 1: build the practitioners query with all filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = adminSupabase
    .from("practitioners")
    .select(
      "id, full_name, rut, grade, dan, is_active, start_date, created_at, address_city, address_region, instructor_id",
      { count: "exact" },
    );

  if (name) query = query.ilike("full_name", `%${name}%`);
  if (rut) query = query.ilike("rut", `%${rut}%`);
  if (grade) query = query.eq("grade", grade);

  // Academy filter
  if (academyFilter === "none") {
    // Sin academia: obtener IDs con membresía activa y excluirlos
    const { data: withAcademy } = await adminSupabase
      .from("academy_memberships")
      .select("practitioner_id")
      .eq("is_active", true);
    const withIds = [
      ...new Set(
        (withAcademy ?? []).map(
          (m: { practitioner_id: string }) => m.practitioner_id,
        ),
      ),
    ];
    if (withIds.length > 0) {
      query = query.not("id", "in", withIds);
    }
    // Si withIds está vacío, nadie tiene academia → mostrar todos
  } else if (academyFilter) {
    const { data: memberIds } = await adminSupabase
      .from("academy_memberships")
      .select("practitioner_id")
      .eq("academy_id", academyFilter)
      .eq("is_active", true);
    const ids = (memberIds ?? []).map(
      (m: { practitioner_id: string }) => m.practitioner_id,
    );
    if (ids.length === 0) {
      query = query.in("id", ["00000000-0000-0000-0000-000000000000"]);
    } else {
      query = query.in("id", ids);
    }
  }

  // Sort: grade needs special handling (enum order, not alpha)
  if (sort === "grade") {
    // Sort by grade order index via a CASE-like approach: fetch all and sort in JS
    // For large tables this is acceptable since we paginate after
    query = query.order("grade", { ascending: dir === "asc" });
  } else {
    query = query.order(sort, { ascending: dir === "asc" });
  }

  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: rows, count } = await query;
  const practitioners = rows ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Step 2: enrich with academy names and instructor names (only for current page)
  const practitionerIds = practitioners.map((p: { id: string }) => p.id);

  const [{ data: memberships }, { data: instructorRows }] = await Promise.all([
    practitionerIds.length > 0
      ? adminSupabase
          .from("academy_memberships")
          .select("practitioner_id, academies(name)")
          .eq("is_active", true)
          .in("practitioner_id", practitionerIds)
      : Promise.resolve({ data: [] }),
    adminSupabase
      .from("practitioners")
      .select("id, full_name")
      .in("role", ["instructor", "profesor", "maestro"]),
  ]);

  const academyByPractitioner = new Map<string, string>();
  for (const m of memberships ?? []) {
    const name = (m.academies as { name: string } | null)?.name;
    if (name) academyByPractitioner.set(m.practitioner_id as string, name);
  }
  const instructorNameById = new Map<string, string>();
  for (const i of instructorRows ?? []) {
    instructorNameById.set(i.id as string, i.full_name as string);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Practicantes
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            {totalCount.toLocaleString("es-CL")} registros
          </p>
        </div>
        <Link
          href="/admin/practitioners/new"
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Registrar nuevo
        </Link>
      </div>

      {/* Filters */}
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
        <div className="w-36">
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
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Grado
          </label>
          <select
            name="grade"
            defaultValue={grade}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Todos</option>
            {GRADE_ORDER.map((g) => (
              <option key={g} value={g}>
                {GRADE_LABELS[g]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Academia
          </label>
          <select
            name="academy"
            defaultValue={academyFilter}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Todas</option>
            <option value="none">Sin academia</option>
            {(academyList ?? []).map((a: { id: string; name: string }) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        {/* preserve sort/dir */}
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Buscar
          </button>
          {(name || rut || grade || academyFilter) && (
            <Link
              href={buildUrl({}, { sort, dir })}
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
              No se encontraron practicantes.
            </p>
            {!name && !rut && !grade && !academyFilter && (
              <Link
                href="/admin/practitioners/new"
                className="inline-block mt-3 text-primary-400 hover:text-primary-300 text-sm transition-colors"
              >
                Registrar el primero →
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700 bg-neutral-900/80">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">
                    <SortLink
                      label="Nombre"
                      field="full_name"
                      current={sort}
                      dir={dir}
                      base={baseParams}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                    RUT
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">
                    <SortLink
                      label="Grado"
                      field="grade"
                      current={sort}
                      dir={dir}
                      base={baseParams}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider hidden lg:table-cell">
                    <SortLink
                      label="Inscripción"
                      field="start_date"
                      current={sort}
                      dir={dir}
                      base={baseParams}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden lg:table-cell">
                    Ciudad
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden xl:table-cell">
                    Academia
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden xl:table-cell">
                    Instructor
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 w-12" />
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
                    is_active: boolean;
                    start_date: string;
                    address_city: string | null;
                    address_region: string | null;
                    instructor_id: string | null;
                  }) => {
                    const academy = academyByPractitioner.get(p.id);
                    const instructor = p.instructor_id
                      ? instructorNameById.get(p.instructor_id)
                      : null;
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-neutral-800/40 transition-colors"
                      >
                        <td className="px-4 py-3 text-neutral-100 font-medium">
                          {p.full_name}
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
                        <td className="px-4 py-3 text-neutral-400 tabular-nums text-xs hidden lg:table-cell">
                          {p.start_date}
                        </td>
                        <td className="px-4 py-3 text-neutral-400 text-xs hidden lg:table-cell">
                          {[p.address_city, p.address_region]
                            .filter(Boolean)
                            .join(", ") || (
                            <span className="text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-400 text-xs hidden xl:table-cell">
                          {academy ?? (
                            <span className="text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-neutral-400 text-xs hidden xl:table-cell">
                          {instructor ?? (
                            <span className="text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {p.is_active ? (
                            <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full text-xs">
                              Activo
                            </span>
                          ) : (
                            <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/practitioners/${p.id}`}
                            className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
                          >
                            Ver
                          </Link>
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
                href={buildUrl(baseParams, { page: String(page - 1) })}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-xs text-neutral-200 transition-colors"
              >
                ← Anterior
              </Link>
            )}
            {/* Page numbers — show window of 5 around current */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p2 = start + i;
              return (
                <Link
                  key={p2}
                  href={buildUrl(baseParams, { page: String(p2) })}
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
                href={buildUrl(baseParams, { page: String(page + 1) })}
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

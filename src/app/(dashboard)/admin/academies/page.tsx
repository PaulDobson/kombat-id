import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";
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

type SortField = "name" | "created_at" | "city" | "region";
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
  return `/admin/academies${qs ? `?${qs}` : ""}`;
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
      className={`flex items-center gap-1 whitespace-nowrap transition-colors ${
        isActive
          ? "text-primary-400"
          : "text-neutral-400 hover:text-neutral-200"
      }`}
    >
      {label}
      {isActive ? (dir === "asc" ? " ↑" : " ↓") : " ↕"}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminAcademiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    name?: string;
    region?: string;
    city?: string;
    status?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  await requireAdminUser();
  const sp = await searchParams;

  const name = sp.name?.trim() ?? "";
  const region = sp.region ?? "";
  const city = sp.city?.trim() ?? "";
  const status = sp.status ?? ""; // "active" | "inactive" | ""
  const sort: SortField = (
    ["name", "created_at", "city", "region"].includes(sp.sort ?? "")
      ? sp.sort
      : "name"
  ) as SortField;
  const dir: SortDir = sp.dir === "desc" ? "desc" : "asc";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const baseParams: Record<string, string | undefined> = {
    name: name || undefined,
    region: region || undefined,
    city: city || undefined,
    status: status || undefined,
    sort,
    dir,
  };

  // ── Main query — filtered, sorted, paginated ──────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = adminSupabase
    .from("academies")
    .select(
      "id, name, region, city, address, is_active, founded_date, created_at",
      { count: "exact" },
    );

  if (name) query = query.ilike("name", `%${name}%`);
  if (region) query = query.eq("region", region);
  if (city) query = query.ilike("city", `%${city}%`);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  query = query.order(sort, { ascending: dir === "asc" });
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: rows, count } = await query;
  const academies = rows ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ── Enrich: active practitioner count per academy (current page only) ─────
  const academyIds = academies.map((a: { id: string }) => a.id);
  const { data: memberCounts } =
    academyIds.length > 0
      ? await adminSupabase
          .from("academy_memberships")
          .select("academy_id")
          .eq("is_active", true)
          .in("academy_id", academyIds)
      : { data: [] };

  const countByAcademy = new Map<string, number>();
  for (const m of memberCounts ?? []) {
    const id = m.academy_id as string;
    countByAcademy.set(id, (countByAcademy.get(id) ?? 0) + 1);
  }

  const hasFilters = !!(name || region || city || status);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Academias
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            {totalCount.toLocaleString("es-CL")} registros
          </p>
        </div>
        <Link
          href="/admin/academies/new"
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Registrar academia
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
        <div className="w-40">
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Ciudad / Comuna
          </label>
          <input
            name="city"
            defaultValue={city}
            placeholder="Ej: Santiago"
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Región
          </label>
          <select
            name="region"
            defaultValue={region}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Todas</option>
            {Object.entries(REGION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Estado
          </label>
          <select
            name="status"
            defaultValue={status}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Todas</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
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
          {hasFilters && (
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
        {academies.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-500 text-sm">
              No se encontraron academias.
            </p>
            {!hasFilters && (
              <Link
                href="/admin/academies/new"
                className="inline-block mt-3 text-primary-400 hover:text-primary-300 text-sm transition-colors"
              >
                Registrar la primera →
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
                      field="name"
                      current={sort}
                      dir={dir}
                      base={baseParams}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider hidden sm:table-cell">
                    <SortLink
                      label="Región"
                      field="region"
                      current={sort}
                      dir={dir}
                      base={baseParams}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider hidden md:table-cell">
                    <SortLink
                      label="Ciudad"
                      field="city"
                      current={sort}
                      dir={dir}
                      base={baseParams}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden lg:table-cell">
                    Dirección
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden lg:table-cell">
                    Alumnos
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider hidden xl:table-cell">
                    <SortLink
                      label="Creada"
                      field="created_at"
                      current={sort}
                      dir={dir}
                      base={baseParams}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {academies.map(
                  (a: {
                    id: string;
                    name: string;
                    region: string;
                    city: string;
                    address: string | null;
                    is_active: boolean;
                    founded_date: string | null;
                    created_at: string;
                  }) => (
                    <tr
                      key={a.id}
                      className="hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-neutral-100 font-medium">
                        {a.name}
                      </td>
                      <td className="px-4 py-3 text-neutral-400 text-xs hidden sm:table-cell">
                        {REGION_LABELS[a.region as ChileanRegion] ?? a.region}
                      </td>
                      <td className="px-4 py-3 text-neutral-400 text-xs hidden md:table-cell">
                        {a.city}
                      </td>
                      <td className="px-4 py-3 text-neutral-500 text-xs hidden lg:table-cell max-w-[180px] truncate">
                        {a.address ?? (
                          <span className="text-neutral-700">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className="text-neutral-200 font-semibold tabular-nums text-sm">
                          {countByAcademy.get(a.id) ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 tabular-nums text-xs hidden xl:table-cell">
                        {a.created_at.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        {a.is_active ? (
                          <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full text-xs">
                            Activa
                          </span>
                        ) : (
                          <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
                            Inactiva
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/academies/${a.id}`}
                          className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ),
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

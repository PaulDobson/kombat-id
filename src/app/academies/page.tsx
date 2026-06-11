import { adminSupabase } from "@/lib/supabase/admin";
import { PublicNav } from "@/app/_components/PublicNav";
import Link from "next/link";
import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";
import { REGION_LABELS } from "@/lib/presentation-constants";
import {
  MapPin,
  Users,
  Shield,
  CheckCircle,
  Search,
  Building2,
  GraduationCap,
  Star,
  ChevronRight,
} from "lucide-react";

interface AcademyRow {
  id: string;
  name: string;
  region: ChileanRegion;
  city: string;
  address: string | null;
  founded_date: string | null;
  responsible_instructor_ids: string[];
}

interface InstructorRow {
  id: string;
  full_name: string;
  role: string | null;
}

interface AcademyWithInstructors extends AcademyRow {
  instructors: InstructorRow[];
}

const ROLE_LABELS: Record<string, string> = {
  instructor: "Instructor",
  profesor: "Profesor",
  maestro: "Maestro",
};

const ROLE_COLORS: Record<string, string> = {
  maestro: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  profesor: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  instructor: "text-primary-400 bg-primary-400/10 border-primary-400/20",
};

export default async function PublicAcademiesPage({
  searchParams,
}: {
  searchParams?: Promise<{ region?: string; q?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const regionFilter = sp.region ?? "";
  const searchQuery = sp.q?.trim() ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = adminSupabase
    .from("academies")
    .select(
      "id, name, region, city, address, founded_date, responsible_instructor_ids",
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (regionFilter) query = query.eq("region", regionFilter);
  if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);

  const { data: academyRows } = await query;
  const academies: AcademyRow[] = academyRows ?? [];

  const allInstructorIds = [
    ...new Set(academies.flatMap((a) => a.responsible_instructor_ids)),
  ];

  const instructorMap = new Map<string, InstructorRow>();
  if (allInstructorIds.length > 0) {
    const { data: instructorRows } = await adminSupabase
      .from("practitioners")
      .select("id, full_name, role")
      .in("id", allInstructorIds);
    for (const row of instructorRows ?? []) {
      instructorMap.set(row.id as string, row as InstructorRow);
    }
  }

  const enriched: AcademyWithInstructors[] = academies.map((a) => ({
    ...a,
    instructors: a.responsible_instructor_ids
      .map((id) => instructorMap.get(id))
      .filter(Boolean) as InstructorRow[],
  }));

  const { count: totalAcademies } = await adminSupabase
    .from("academies")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: totalPractitioners } = await adminSupabase
    .from("practitioners")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const byRegion = new Map<string, AcademyWithInstructors[]>();
  for (const academy of enriched) {
    const regionLabel =
      REGION_LABELS[academy.region as ChileanRegion] ?? academy.region;
    if (!byRegion.has(regionLabel)) byRegion.set(regionLabel, []);
    byRegion.get(regionLabel)!.push(academy);
  }

  const { data: regionRows } = await adminSupabase
    .from("academies")
    .select("region")
    .eq("is_active", true);
  const availableRegions = [
    ...new Set((regionRows ?? []).map((r) => r.region as ChileanRegion)),
  ].sort();

  const isFiltered = !!(regionFilter || searchQuery);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <PublicNav />
      <main className="pt-16">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-neutral-800/60">
          <div
            className="absolute inset-0 bg-linear-to-br from-indigo-950/50 via-neutral-950 to-neutral-950"
            aria-hidden="true"
          />
          <div
            className="absolute top-0 left-1/3 w-[700px] h-[500px] bg-indigo-600/8 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-primary-600/6 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative max-w-7xl mx-auto px-6 py-16 sm:py-24 space-y-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              ← Volver al inicio
            </Link>
            <div className="flex flex-col lg:flex-row lg:items-end gap-10">
              <div className="flex-1 space-y-5 max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-full tracking-widest uppercase">
                  <Shield className="w-3.5 h-3.5" />
                  Red oficial · Federación Nacional
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none">
                  Academias
                  <br />
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-400 via-primary-400 to-indigo-300">
                    certificadas
                  </span>
                </h1>
                <p className="text-neutral-400 text-base sm:text-lg leading-relaxed">
                  Cada academia listada está oficialmente registrada y avalada
                  por Kombat Taekwondo Chile. Sus instructores son practicantes
                  certificados con historial verificable en el sistema.
                </p>
                <ul className="flex flex-wrap gap-4">
                  {[
                    "Instructores con certificación oficial",
                    "Alumnos con identidad digital verificable",
                    "Registro federativo nacional",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-neutral-300"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3 shrink-0 lg:w-48">
                <StatPill
                  value={totalAcademies ?? 0}
                  label="Academias activas"
                  color="text-indigo-400"
                  icon={Building2}
                />
                <StatPill
                  value={totalPractitioners ?? 0}
                  label="Practicantes activos"
                  color="text-primary-400"
                  icon={Users}
                />
                <StatPill
                  value={availableRegions.length}
                  label="Regiones"
                  color="text-emerald-400"
                  icon={MapPin}
                />
              </div>
            </div>
          </div>
        </section>

        {/* FILTERS */}
        <div className="sticky top-16 z-20 border-b border-neutral-800/60 bg-neutral-950/95 backdrop-blur-sm">
          <form
            method="GET"
            className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center gap-3"
          >
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
              <input
                name="q"
                defaultValue={searchQuery}
                placeholder="Buscar academia..."
                className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-700 rounded-full text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <select
              name="region"
              defaultValue={regionFilter}
              className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-full text-sm text-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Todas las regiones</option>
              {availableRegions.map((r) => (
                <option key={r} value={r}>
                  {REGION_LABELS[r] ?? r}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-full text-sm font-medium transition-colors"
            >
              Buscar
            </button>
            {isFiltered && (
              <Link
                href="/academies"
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors px-2"
              >
                ✕ Limpiar
              </Link>
            )}
            <span className="ml-auto text-xs text-neutral-500 hidden sm:block">
              {enriched.length} academia{enriched.length !== 1 ? "s" : ""}
              {isFiltered ? " encontradas" : " en total"}
            </span>
          </form>
        </div>

        {/* ACADEMY LIST */}
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-16">
          {enriched.length === 0 ? (
            <div className="text-center py-24 space-y-4">
              <Building2 className="w-12 h-12 text-neutral-700 mx-auto" />
              <p className="text-neutral-500 text-sm">
                No se encontraron academias.
              </p>
              <Link
                href="/academies"
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                Ver todas las academias →
              </Link>
            </div>
          ) : (
            <div className="space-y-14">
              {Array.from(byRegion.entries()).map(([regionLabel, list]) => (
                <section key={regionLabel}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-indigo-400" />
                      </div>
                      <h2 className="text-base font-bold text-neutral-100">
                        {regionLabel}
                      </h2>
                    </div>
                    <div className="h-px flex-1 bg-neutral-800" />
                    <span className="text-xs text-neutral-600 font-medium">
                      {list.length} academia{list.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {list.map((academy) => (
                      <AcademyCard key={academy.id} academy={academy} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <section className="border-t border-neutral-800 bg-linear-to-br from-indigo-950/40 to-neutral-950">
          <div className="max-w-4xl mx-auto px-6 py-16 text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary-900/40 border border-primary-800/60 text-primary-400 text-xs font-semibold px-3 py-1.5 rounded-full tracking-widest uppercase">
              <Star className="w-3.5 h-3.5" />
              ¿Quieres practicar?
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Encuentra tu academia y{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-400 to-indigo-300">
                comienza hoy
              </span>
            </h2>
            <p className="text-neutral-400 text-base max-w-xl mx-auto leading-relaxed">
              Contáctate con la academia más cercana a ti. Todos los
              instructores tienen certificación oficial y sus alumnos cuentan
              con identidad digital verificable.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/instructor-registration"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-900/40 hover:-translate-y-0.5"
              >
                Registrar mi academia →
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 px-6 py-3.5 rounded-xl text-sm font-medium transition-colors"
              >
                Conocer más sobre la plataforma
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-800 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded bg-primary-600 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-white font-bold text-[9px]">KT</span>
            </div>
            <span>Kombat Taekwondo Chile</span>
          </div>
          <p>
            Red oficial de academias certificadas · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── StatPill ─────────────────────────────────────────────────────────────────

function StatPill({
  value,
  label,
  color,
  icon: Icon,
}: {
  value: number;
  label: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl px-5 py-4 flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-xl ${color.replace("text-", "bg-").replace("400", "400/10")} flex items-center justify-center shrink-0`}
      >
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <p className={`text-2xl font-black tabular-nums leading-none ${color}`}>
          {value.toLocaleString("es-CL")}
        </p>
        <p className="text-xs text-neutral-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── AcademyCard ──────────────────────────────────────────────────────────────

function AcademyCard({ academy }: { academy: AcademyWithInstructors }) {
  const foundedYear = academy.founded_date
    ? new Date(academy.founded_date).getFullYear()
    : null;

  return (
    <Link
      href={`/academies/${academy.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 hover:border-indigo-700/50 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-950/30"
    >
      <div className="flex flex-col gap-5 p-6 h-full">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/15 transition-colors">
            <Building2 className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-neutral-50 leading-snug group-hover:text-indigo-300 transition-colors">
              {academy.name}
            </h3>
            <p className="flex items-center gap-1 text-sm text-neutral-400 mt-0.5">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-neutral-600" />
              {academy.city}
            </p>
            {academy.address && (
              <p className="text-xs text-neutral-600 mt-0.5 truncate">
                {academy.address}
              </p>
            )}
          </div>
        </div>

        {/* Verified badge */}
        <div className="flex items-center gap-1.5 bg-emerald-500/8 border border-emerald-500/20 rounded-lg px-3 py-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-xs text-emerald-400 font-medium">
            Academia certificada · Federación Nacional
          </span>
        </div>

        {/* Instructors */}
        {academy.instructors.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
              Instructor{academy.instructors.length !== 1 ? "es" : ""}
            </p>
            <ul className="space-y-1.5">
              {academy.instructors.map((instructor) => {
                const roleLabel =
                  ROLE_LABELS[instructor.role ?? ""] ??
                  instructor.role ??
                  "Instructor";
                const roleColor =
                  ROLE_COLORS[instructor.role ?? ""] ?? ROLE_COLORS.instructor;
                return (
                  <li
                    key={instructor.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-neutral-300">
                          {instructor.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-neutral-300 truncate">
                        {instructor.full_name}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${roleColor}`}
                    >
                      {roleLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {foundedYear && (
              <span className="flex items-center gap-1 text-xs text-neutral-600">
                <GraduationCap className="w-3.5 h-3.5 text-neutral-700" />
                Desde {foundedYear}
              </span>
            )}
          </div>
          <span className="flex items-center gap-0.5 text-xs text-indigo-400/70 group-hover:text-indigo-400 transition-colors font-medium">
            Ver academia
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

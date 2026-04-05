import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { DrizzleAcademyRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleAcademyRepository";
import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";
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

  if (!data) redirect("/");
  return user;
}

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

export default async function AdminAcademiesPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; region?: string; city?: string }>;
}) {
  await requireAdminUser();
  const params = await searchParams;
  const repo = new DrizzleAcademyRepository();

  const academies = await repo.search({
    ...(params.name ? { name: params.name } : {}),
    ...(params.region ? { region: params.region as ChileanRegion } : {}),
    ...(params.city ? { city: params.city } : {}),
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-neutral-50 tracking-tight">
          Academias
        </h1>
        <Link
          href="/admin/academies/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Registrar academia
        </Link>
      </div>

      <form
        method="GET"
        className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 mb-6 flex flex-wrap gap-3"
      >
        <input
          name="name"
          defaultValue={params.name}
          placeholder="Nombre"
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <input
          name="city"
          defaultValue={params.city}
          placeholder="Ciudad"
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <select
          name="region"
          defaultValue={params.region ?? ""}
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          <option value="">Todas las regiones</option>
          {Object.entries(REGION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Buscar
        </button>
      </form>

      <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
        {academies.length === 0 ? (
          <p className="text-neutral-500 text-sm text-center py-8">
            No se encontraron academias.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Región
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Ciudad
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {academies.map((academy) => (
                <tr
                  key={academy.id}
                  className="hover:bg-neutral-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-neutral-100">{academy.name}</td>
                  <td className="px-4 py-3 text-neutral-300">
                    {REGION_LABELS[academy.region] ?? academy.region}
                  </td>
                  <td className="px-4 py-3 text-neutral-300">{academy.city}</td>
                  <td className="px-4 py-3">
                    {academy.isActive ? (
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
                      href={`/admin/academies/${academy.id}`}
                      className="text-indigo-400 hover:text-indigo-300 text-sm"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

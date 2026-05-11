import { Search } from "lucide-react";
import { PublicNav } from "@/app/_components/PublicNav";
import {
  type RefereeListItem,
  toRefereeListItem,
} from "@/modules/referee-registration/presentation/components/refereeListItem";
import { RefereeGrid } from "@/modules/referee-registration/presentation/components/RefereeGrid";
import { listRefereeRegistrations } from "@/modules/referee-registration/application/use-cases/listRefereeRegistrations";
import { SupabaseRefereeRegistrationRepository } from "@/modules/referee-registration/infrastructure/repositories/supabaseRefereeRegistrationRepository";

async function getApprovedReferees(): Promise<RefereeListItem[]> {
  const repo = new SupabaseRefereeRegistrationRepository();
  const { items } = await listRefereeRegistrations(
    { status: "approved", pageSize: 200 },
    { repo },
  );
  return items.map(toRefereeListItem);
}

export default async function RefereesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const [referees, { search }] = await Promise.all([
    getApprovedReferees(),
    searchParams,
  ]);
  const searchQuery = search?.trim() || undefined;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <PublicNav />

      <main className="max-w-7xl mx-auto px-6 pt-28 pb-20">
        {/* Header */}
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 bg-neutral-800 border border-neutral-700 text-neutral-400 text-xs font-medium px-3 py-1.5 rounded-full">
              Directorio
            </span>
            <h1 className="text-4xl font-bold tracking-tight">
              Árbitros Oficiales
            </h1>
            <p className="text-neutral-400">
              Árbitros certificados de Kombat Taekwondo Chile
            </p>
          </div>
          <span className="text-sm text-neutral-500 shrink-0">
            {referees.length} {referees.length === 1 ? "árbitro" : "árbitros"}
          </span>
        </div>

        {/* Search */}
        <form method="GET" className="mb-10">
          <div className="relative max-w-sm">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              size={14}
            />
            <input
              type="search"
              name="search"
              defaultValue={searchQuery ?? ""}
              placeholder="Buscar por nombre..."
              className="w-full rounded-xl border border-neutral-700 bg-neutral-800/60 pl-9 pr-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>
        </form>

        {/* Grid */}
        <RefereeGrid
          referees={referees}
          {...(searchQuery !== undefined && { searchQuery })}
        />
      </main>
    </div>
  );
}

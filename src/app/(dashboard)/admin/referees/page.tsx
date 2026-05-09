// Server Component — no "use client", no React hooks
// Validates: Requisitos 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 8.1

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { SupabaseRefereeRegistrationRepository } from "@/modules/referee-registration/infrastructure/repositories/supabaseRefereeRegistrationRepository";
import { listRefereeRegistrations } from "@/modules/referee-registration/application/use-cases/listRefereeRegistrations";
import { toRefereeListItem } from "@/modules/referee-registration/presentation/components/refereeListItem";
import { RefereeGrid } from "@/modules/referee-registration/presentation/components/RefereeGrid";

// ---------------------------------------------------------------------------
// Auth guard — Requisitos 1.1, 1.2, 1.3
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
// Page — Requisito 8.1: export default async function, no "use client"
// ---------------------------------------------------------------------------

export default async function AdminRefereesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  // Requisito 1.3 — requireAdminUser is the first operation
  await requireAdminUser();

  // Requisito 2.1 — instantiate repository (composition root) and call use case
  const repo = new SupabaseRefereeRegistrationRepository();
  const { items, total } = await listRefereeRegistrations(
    { status: "approved", pageSize: 200 },
    { repo },
  );

  // Requisitos 2.2, 2.3 — serialize to RefereeListItem (excludes sensitive fields)
  const referees = items.map(toRefereeListItem);

  // Requisitos 3.3, 3.4, 3.5 — read search query param
  const sp = await searchParams;
  const searchQuery = sp.search?.trim() ?? "";

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header — Requisitos 3.1, 3.2 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Árbitros Oficiales
          </h1>
          <p className="mt-0.5 text-sm text-neutral-400">
            Registro oficial de árbitros de Kombat Taekwondo Chile
          </p>
          {/* Requisito 3.2 — counter equals total from use case, not filtered count */}
          <p className="mt-1 text-xs text-neutral-500">
            {total.toLocaleString("es-CL")}{" "}
            {total === 1 ? "árbitro" : "árbitros"}
          </p>
        </div>

        {/* Search field — Requisitos 3.3, 3.4, 3.5: native GET form, no "use client" needed */}
        <form method="GET" className="w-full sm:w-72">
          <label htmlFor="search" className="sr-only">
            Buscar árbitro por nombre
          </label>
          <input
            id="search"
            name="search"
            type="search"
            defaultValue={searchQuery}
            placeholder="Buscar por nombre..."
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </form>
      </div>

      {/* Grid — Requisito 2.4: pass referees and searchQuery to RefereeGrid */}
      <RefereeGrid referees={referees} searchQuery={searchQuery} />
    </main>
  );
}

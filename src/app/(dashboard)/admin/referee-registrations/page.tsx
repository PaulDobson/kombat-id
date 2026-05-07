// Server Component — no "use client"
// Validates: Requisitos 3.1–3.5, 10.2

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { SupabaseRefereeRegistrationRepository } from "@/modules/referee-registration/infrastructure/repositories/supabaseRefereeRegistrationRepository";
import { listRefereeRegistrations } from "@/modules/referee-registration/application/use-cases/listRefereeRegistrations";
import { RefereeRegistrationTable } from "@/modules/referee-registration/presentation/components/RefereeRegistrationTable";
import type { RefereeRegistrationStatus } from "@/modules/referee-registration/domain/entities/refereeRegistration";

const PAGE_SIZE = 25;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Aprobados" },
  { value: "rejected", label: "Rechazados" },
];

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

export default async function AdminRefereesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdminUser();

  const params = await searchParams;
  const statusFilter = params.status as RefereeRegistrationStatus | undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const repo = new SupabaseRefereeRegistrationRepository();
  const { items, total } = await listRefereeRegistrations(
    {
      ...(statusFilter !== undefined && { status: statusFilter }),
      page,
      pageSize: PAGE_SIZE,
    },
    { repo },
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Serialize to plain objects for Client Components
  const rows = items.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    country: r.country,
    registrationNumber: r.registrationNumber,
    status: r.status,
    createdAt: r.createdAt,
  }));

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Árbitros
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            Registro oficial de árbitros de Kombat Taekwondo Chile
          </p>
        </div>
        <Link
          href="/admin/referee-registrations/publications"
          className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Portal de árbitros
        </Link>
      </div>

      {/* Status filter */}
      <form
        method="GET"
        className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 flex flex-wrap gap-2"
      >
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="submit"
            name="status"
            value={opt.value}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              (statusFilter ?? "") === opt.value
                ? "bg-primary-600 text-white"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-neutral-500 self-center">
          {total} registro{total !== 1 ? "s" : ""}
        </span>
      </form>

      {/* Table */}
      <RefereeRegistrationTable
        registrations={rows}
        currentPage={page}
        totalPages={totalPages}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`?status=${statusFilter ?? ""}&page=${page - 1}`}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-lg text-xs font-medium transition-colors"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-xs text-neutral-500">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`?status=${statusFilter ?? ""}&page=${page + 1}`}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-lg text-xs font-medium transition-colors"
            >
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </main>
  );
}

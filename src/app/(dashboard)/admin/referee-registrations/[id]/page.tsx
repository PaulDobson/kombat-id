// Server Component — no "use client"
// Validates: Requisitos 6.1, 9.1, 9.2, 9.3

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { SupabaseRefereeRegistrationRepository } from "@/modules/referee-registration/infrastructure/repositories/supabaseRefereeRegistrationRepository";
import { getRefereeRegistrationById } from "@/modules/referee-registration/application/use-cases/getRefereeRegistrationById";
import { EditRegistrationForm } from "@/modules/referee-registration/presentation/components/EditRegistrationForm";
import { ApproveRegistrationButton } from "@/modules/referee-registration/presentation/components/ApproveRegistrationButton";
import { RejectRegistrationButton } from "@/modules/referee-registration/presentation/components/RejectRegistrationButton";
import { ViewCertificateButton } from "@/modules/referee-registration/presentation/components/ViewCertificateButton";
import { RefereeRegistrationNotFoundError } from "@/modules/referee-registration/domain/errors";

const STATUS_LABELS = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
} as const;

const STATUS_COLORS = {
  pending: "bg-amber-900/40 text-amber-300 border-amber-700/40",
  approved: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40",
  rejected: "bg-red-900/40 text-red-300 border-red-700/40",
} as const;

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

export default async function AdminRefereeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminUser();

  const { id } = await params;
  const repo = new SupabaseRefereeRegistrationRepository();

  let registration;
  try {
    registration = await getRefereeRegistrationById(id, { repo });
  } catch (err) {
    if (err instanceof RefereeRegistrationNotFoundError) {
      notFound();
    }
    throw err;
  }

  const row = {
    id: registration.id,
    fullName: registration.fullName,
    email: registration.email,
    country: registration.country,
    registrationNumber: registration.registrationNumber,
    status: registration.status,
    createdAt: registration.createdAt,
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-neutral-500">
        <Link
          href="/admin/referee-registrations"
          className="hover:text-neutral-300 transition-colors"
        >
          Árbitros
        </Link>
        <span className="mx-2">›</span>
        <span className="text-neutral-300">{registration.fullName}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-neutral-100">
            {registration.fullName}
          </h1>
          <p className="text-sm text-neutral-400">{registration.email}</p>
        </div>
        <span
          className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[registration.status]}`}
        >
          {STATUS_LABELS[registration.status]}
        </span>
      </div>

      {/* Details */}
      <div className="bg-neutral-900 border border-neutral-700/60 rounded-xl p-5 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">País</p>
            <p className="text-neutral-200">{registration.country}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">
              N° Registro oficial
            </p>
            <p className="text-neutral-200 font-mono text-xs">
              {registration.registrationNumber}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-0.5">Fecha de envío</p>
            <p className="text-neutral-200">
              {new Date(registration.createdAt).toLocaleDateString("es-CL", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          {registration.approvedAt && (
            <div>
              <p className="text-xs text-neutral-500 mb-0.5">
                Fecha de aprobación
              </p>
              <p className="text-neutral-200">
                {new Date(registration.approvedAt).toLocaleDateString("es-CL")}
              </p>
            </div>
          )}
        </div>

        {/* Certificate */}
        <div className="pt-2 border-t border-neutral-700/40">
          <p className="text-xs text-neutral-500 mb-2">Certificado PDF</p>
          <ViewCertificateButton id={registration.id} />
        </div>
      </div>

      {/* Actions for pending registrations */}
      {registration.status === "pending" && (
        <div className="bg-neutral-900 border border-neutral-700/60 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-neutral-300">
            Acciones de revisión
          </h2>
          <div className="flex gap-3">
            <ApproveRegistrationButton id={registration.id} />
            <RejectRegistrationButton id={registration.id} />
          </div>
        </div>
      )}

      {/* Edit form */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-300">
          Editar datos del registro
        </h2>
        <EditRegistrationForm registration={row} />
      </div>
    </main>
  );
}

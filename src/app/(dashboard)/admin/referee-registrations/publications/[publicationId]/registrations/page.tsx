// Server Component — no "use client"
// Validates: Requisitos 5.1, 5.2, 5.3, 5.4, 5.5

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { SupabaseRefereePortalPublicationRepository } from "@/modules/referee-registration/infrastructure/repositories/supabaseRefereePortalPublicationRepository";
import { SupabaseRefereeEventRegistrationRepository } from "@/modules/referee-registration/infrastructure/repositories/supabaseRefereeEventRegistrationRepository";
import { listEventRegistrations } from "@/modules/referee-registration/application/use-cases/listEventRegistrations";
import { NotAnEventError } from "@/modules/referee-registration/domain/errors";

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

interface Props {
  params: Promise<{ publicationId: string }>;
}

export default async function EventRegistrationsPage({ params }: Props) {
  await requireAdminUser();

  const { publicationId } = await params;

  const publicationRepo = new SupabaseRefereePortalPublicationRepository();
  const registrationRepo = new SupabaseRefereeEventRegistrationRepository();

  let registrations;
  let publication;

  try {
    publication = await publicationRepo.findById(publicationId);
    if (!publication) notFound();

    registrations = await listEventRegistrations(
      { publicationId },
      { publicationRepo, registrationRepo },
    );
  } catch (err) {
    if (err instanceof NotAnEventError) notFound();
    throw err;
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/referee-registrations/publications"
          className="text-neutral-500 hover:text-neutral-300 text-sm transition-colors"
        >
          ← Publicaciones
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Inscritos al evento
        </h1>
        <p className="text-sm text-neutral-400 mt-0.5 truncate">
          {publication.title}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-neutral-400">
        <span>
          {registrations.length} árbitro
          {registrations.length !== 1 ? "s" : ""} inscrito
          {registrations.length !== 1 ? "s" : ""}
        </span>
        {publication.maxParticipants && (
          <span>· Cupo máximo: {publication.maxParticipants}</span>
        )}
        {publication.eventDate && (
          <span>
            ·{" "}
            {new Date(publication.eventDate + "T00:00:00").toLocaleDateString(
              "es-CL",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              },
            )}
          </span>
        )}
      </div>

      {registrations.length === 0 ? (
        <div className="text-center py-16 text-neutral-500 text-sm">
          No hay árbitros inscritos aún.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-700/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700/60 bg-neutral-800/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Fecha de inscripción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-700/40">
              {registrations.map((reg) => (
                <tr
                  key={reg.id}
                  className="bg-neutral-900 hover:bg-neutral-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-neutral-200 font-medium">
                    {reg.refereeName}
                  </td>
                  <td className="px-4 py-3 text-neutral-400">
                    {reg.refereeEmail}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(reg.registeredAt).toLocaleDateString("es-CL", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

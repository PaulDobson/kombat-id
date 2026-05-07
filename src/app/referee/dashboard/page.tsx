// Server Component — no "use client"
// Validates: Requisitos 7.1, 7.4, 7.5, 7.6, 2.7

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SupabaseRefereePortalPublicationRepository } from "@/modules/referee-registration/infrastructure/repositories/supabaseRefereePortalPublicationRepository";
import { SupabaseRefereeEventRegistrationRepository } from "@/modules/referee-registration/infrastructure/repositories/supabaseRefereeEventRegistrationRepository";
import { listPortalPublications } from "@/modules/referee-registration/application/use-cases/listPortalPublications";
import { PortalPublicationList } from "@/modules/referee-registration/presentation/components/PortalPublicationList";

export const metadata = {
  title: "Portal de Árbitros — Kombat Taekwondo Chile",
};

export default async function RefereeDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const publicationRepo = new SupabaseRefereePortalPublicationRepository();
  const registrationRepo = new SupabaseRefereeEventRegistrationRepository();

  // Fetch publications and referee's event registrations in parallel
  const [publications, eventRegistrations] = await Promise.all([
    listPortalPublications({ repo: publicationRepo }),
    registrationRepo.findByReferee(user.id),
  ]);

  // Fetch registration counts for event publications in parallel
  const eventPublications = publications.filter((p) => p.isEvent);
  const counts = await Promise.all(
    eventPublications.map((p) => registrationRepo.countByPublication(p.id)),
  );
  const registrationCounts = new Map<string, number>(
    eventPublications.map((p, i) => [p.id, counts[i] ?? 0]),
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-neutral-100">
          Publicaciones del Portal
        </h1>
        <p className="text-sm text-neutral-500">
          Noticias, reglamentos y actualizaciones para árbitros acreditados.
        </p>
      </div>

      <PortalPublicationList
        publications={publications}
        eventRegistrations={eventRegistrations}
        registrationCounts={registrationCounts}
      />
    </div>
  );
}

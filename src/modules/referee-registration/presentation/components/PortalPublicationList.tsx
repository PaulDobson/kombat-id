// Server Component — no "use client"
import type { RefereePortalPublication } from "../../domain/entities/refereePortalPublication";
import type { RefereeEventRegistration } from "../../domain/entities/refereeEventRegistration";
import { PublicationCard } from "./PublicationCard";
import { EventCard } from "./EventCard";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const BUCKET = "referee-portal-images";

function buildCoverImageUrl(coverImagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${coverImagePath}`;
}

interface Props {
  publications: RefereePortalPublication[];
  eventRegistrations: RefereeEventRegistration[];
  registrationCounts: Map<string, number>;
}

export function PortalPublicationList({
  publications,
  eventRegistrations,
  registrationCounts,
}: Props) {
  if (publications.length === 0) {
    return (
      <div className="text-center py-16 text-neutral-500 text-sm">
        No hay publicaciones disponibles aún.
      </div>
    );
  }

  const registeredEventIds = new Set(
    eventRegistrations.map((r) => r.publicationId),
  );

  return (
    <ul className="space-y-6">
      {publications.map((pub) => {
        const coverImageUrl = pub.coverImagePath
          ? buildCoverImageUrl(pub.coverImagePath)
          : null;

        if (pub.isEvent) {
          return (
            <li key={pub.id}>
              <EventCard
                publication={pub}
                coverImageUrl={coverImageUrl}
                isRegistered={registeredEventIds.has(pub.id)}
                registrationCount={registrationCounts.get(pub.id) ?? 0}
              />
            </li>
          );
        }

        return (
          <li key={pub.id}>
            <PublicationCard publication={pub} coverImageUrl={coverImageUrl} />
          </li>
        );
      })}
    </ul>
  );
}

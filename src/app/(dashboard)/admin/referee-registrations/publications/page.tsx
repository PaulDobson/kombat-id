// Server Component — no "use client"
// Validates: Requisitos 8.1, 8.4, 8.5, 3.1, 3.2, 3.3, 3.4

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { SupabaseRefereePortalPublicationRepository } from "@/modules/referee-registration/infrastructure/repositories/supabaseRefereePortalPublicationRepository";
import { SupabaseRefereeEventRegistrationRepository } from "@/modules/referee-registration/infrastructure/repositories/supabaseRefereeEventRegistrationRepository";
import { listPortalPublications } from "@/modules/referee-registration/application/use-cases/listPortalPublications";
import { AdminPublicationCard } from "@/modules/referee-registration/presentation/components/AdminPublicationCard";

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const BUCKET = "referee-portal-images";

function buildCoverImageUrl(coverImagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${coverImagePath}`;
}

export default async function AdminRefereePortalPage() {
  await requireAdminUser();

  const repo = new SupabaseRefereePortalPublicationRepository();
  const publications = await listPortalPublications({ repo });

  // Fetch registration counts for event publications in parallel
  const registrationRepo = new SupabaseRefereeEventRegistrationRepository();
  const eventPublications = publications.filter((p) => p.isEvent);

  const registrationCounts = await Promise.all(
    eventPublications.map((p) => registrationRepo.countByPublication(p.id)),
  );

  const countByPublicationId = new Map<string, number>(
    eventPublications.map((p, i) => [p.id, registrationCounts[i] ?? 0]),
  );

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Portal de Árbitros
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            Publicaciones visibles para árbitros aprobados
          </p>
        </div>
        <Link
          href="/admin/referee-registrations/publications/new"
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nueva publicación
        </Link>
      </div>

      {/* Publications list */}
      {publications.length === 0 ? (
        <div className="text-center py-16 text-neutral-500 text-sm">
          No hay publicaciones aún.{" "}
          <Link
            href="/admin/referee-registrations/publications/new"
            className="text-primary-400 hover:text-primary-300 transition-colors"
          >
            Crear la primera →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {publications.map((pub) => (
            <AdminPublicationCard
              key={pub.id}
              publication={pub}
              coverImageUrl={
                pub.coverImagePath
                  ? buildCoverImageUrl(pub.coverImagePath)
                  : null
              }
              registrationCount={countByPublicationId.get(pub.id) ?? 0}
            />
          ))}
        </ul>
      )}
    </main>
  );
}

// Server Component — no "use client"
// Validates: Requisito 8.4

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { SupabaseRefereePortalPublicationRepository } from "@/modules/referee-registration/infrastructure/repositories/supabaseRefereePortalPublicationRepository";
import { PublicationForm } from "@/modules/referee-registration/presentation/components/PublicationForm";

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

interface Props {
  params: Promise<{ publicationId: string }>;
}

export default async function EditPublicationPage({ params }: Props) {
  await requireAdminUser();

  const { publicationId } = await params;

  const repo = new SupabaseRefereePortalPublicationRepository();
  const publication = await repo.findById(publicationId);

  if (!publication) notFound();

  const coverImageUrl = publication.coverImagePath
    ? buildCoverImageUrl(publication.coverImagePath)
    : null;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <nav className="text-sm text-neutral-500">
        <Link
          href="/admin/referee-registrations/publications"
          className="hover:text-neutral-300 transition-colors"
        >
          Portal de árbitros
        </Link>
        <span className="mx-2">›</span>
        <span className="text-neutral-300 truncate">{publication.title}</span>
      </nav>

      <h1 className="text-xl font-bold text-neutral-100">Editar publicación</h1>

      <PublicationForm
        publication={publication}
        coverImageUrl={coverImageUrl}
      />
    </main>
  );
}

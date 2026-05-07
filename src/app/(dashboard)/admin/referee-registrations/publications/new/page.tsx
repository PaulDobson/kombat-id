// Server Component — no "use client"
// Validates: Requisito 8.1

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
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

export default async function NewPublicationPage() {
  await requireAdminUser();

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
        <span className="text-neutral-300">Nueva publicación</span>
      </nav>

      <h1 className="text-xl font-bold text-neutral-100">Nueva publicación</h1>

      <PublicationForm />
    </main>
  );
}

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EventForm } from "../EventForm";

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

  if (!data) redirect("/");
  return user;
}

export default async function NewEventPage() {
  await requireAdminUser();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/admin/events"
          className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver a eventos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50 mt-2">
          Nuevo evento marcial
        </h1>
      </div>

      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <EventForm />
      </div>
    </main>
  );
}

import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isInstructorRole } from "@/lib/roles";
import { CreateAcademyForm } from "./CreateAcademyForm";

async function requireInstructorUser() {
  const user = await requireUser();

  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!practitioner || !isInstructorRole(practitioner.role as string)) {
    redirect("/instructor");
  }

  return user;
}

export default async function NewInstructorAcademyPage() {
  await requireInstructorUser();

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/instructor"
          className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver al panel
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-50 tracking-tight mt-2">
          Crear nueva academia
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Registra tu academia en la plataforma. Quedarás asignado
          automáticamente como instructor responsable.
        </p>
      </div>

      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <CreateAcademyForm />
      </div>
    </main>
  );
}

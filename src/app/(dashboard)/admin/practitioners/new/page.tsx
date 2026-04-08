import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

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

export default async function NewPractitionerPage() {
  await requireAdminUser();

  // Fetch instructors and masters for the dropdown
  const { data: instructors } = await adminSupabase
    .from("practitioners")
    .select("id, full_name, role, grade, dan")
    .in("role", ["instructor", "profesor", "maestro"])
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  const instructorOptions = (instructors ?? []).map((p) => ({
    id: p.id as string,
    fullName: p.full_name as string,
    role: p.role as string,
  }));

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/admin/practitioners"
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver al listado
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50 mt-2">
          Registrar practicante
        </h1>
        <p className="text-sm text-neutral-400 mt-0.5">
          Completa los datos para crear un nuevo perfil de identidad.
        </p>
      </div>

      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <RegisterForm instructors={instructorOptions} />
      </div>
    </main>
  );
}

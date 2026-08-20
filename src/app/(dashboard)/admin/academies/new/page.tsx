import Link from "next/link";
import { RegisterAcademyForm } from "./RegisterAcademyForm";
import { requireAdmin } from "@/lib/auth-guards";
import { adminSupabase } from "@/lib/supabase/admin";

type InstructorOption = {
  id: string;
  fullName: string;
  rut: string;
  role: string;
};

export default async function NewAcademyPage() {
  await requireAdmin();

  const { data: rows } = await adminSupabase
    .from("practitioners")
    .select("id, full_name, rut, role")
    .in("role", ["instructor", "profesor", "maestro"])
    .eq("is_active", true)
    .order("full_name")
    .limit(500);

  const availableInstructors: InstructorOption[] = (rows ?? []).map(
    (r: { id: string; full_name: string; rut: string; role: string }) => ({
      id: r.id,
      fullName: r.full_name,
      rut: r.rut,
      role: r.role,
    }),
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/admin/academies"
          className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver al listado
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-50 tracking-tight mt-2">
          Registrar nueva academia
        </h1>
      </div>

      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <RegisterAcademyForm availableInstructors={availableInstructors} />
      </div>
    </main>
  );
}

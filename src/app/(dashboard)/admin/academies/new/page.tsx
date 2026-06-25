import Link from "next/link";
import { RegisterAcademyForm } from "./RegisterAcademyForm";
import { requireAdmin } from "@/lib/auth-guards";

export default async function NewAcademyPage() {
  await requireAdmin();

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
        <RegisterAcademyForm />
      </div>
    </main>
  );
}

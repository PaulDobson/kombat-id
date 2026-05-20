import Link from "next/link";
import { requireInstructor } from "@/lib/auth-guards";
import { RegisterStudentForm } from "../RegisterStudentForm";

export default async function RegisterStudentPage() {
  await requireInstructor();

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <Link
          href="/instructor"
          className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver al panel
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50 mt-3">
          Registrar nuevo alumno
        </h1>
      </div>

      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 space-y-4">
        <RegisterStudentForm />
      </div>
    </main>
  );
}

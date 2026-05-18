// Server Component — no "use client"
// Validates: Requisito 1.1

import { InstructorRequestForm } from "@/modules/instructor-account-requests/presentation/components/InstructorRequestForm";

export const metadata = {
  title: "Registro de Instructores — Kombat Taekwondo Chile",
  description:
    "Solicita la creación de tu cuenta como instructor oficial de Kombat Taekwondo Chile.",
};

export default function InstructorRegistrationPage() {
  return (
    <main className="min-h-screen bg-neutral-950 py-16 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-neutral-100">
            Solicitud de Cuenta de Instructor
          </h1>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Completa el formulario para solicitar la creación de tu cuenta como
            instructor en Kombat Taekwondo Chile. Una vez revisada tu solicitud,
            recibirás un email con los próximos pasos para establecer tu
            contraseña.
          </p>
        </div>

        <InstructorRequestForm />
      </div>
    </main>
  );
}

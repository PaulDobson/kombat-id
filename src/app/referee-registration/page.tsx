// Server Component — no "use client"
// Validates: Requisitos 1.1, 1.3, 2.1

import { RefereeRegistrationForm } from "@/modules/referee-registration/presentation/components/RefereeRegistrationForm";

export const metadata = {
  title: "Registro de Árbitros — Kombat Taekwondo Chile",
  description:
    "Solicita tu acreditación como árbitro oficial de Kombat Taekwondo Chile.",
};

export default function RefereeRegistrationPage() {
  return (
    <main className="min-h-screen bg-neutral-950 py-16 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-neutral-100">
            Registro de Árbitros Oficiales
          </h1>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Completa el formulario para solicitar tu acreditación como árbitro
            oficial de Kombat Taekwondo Chile. Una vez revisada tu solicitud,
            recibirás un email con los próximos pasos.
          </p>
        </div>

        <RefereeRegistrationForm />
      </div>
    </main>
  );
}

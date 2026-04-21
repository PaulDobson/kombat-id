import { requireUser } from "@/lib/supabase/server";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { PractitionerQrCode } from "@/modules/practitioner-identity/presentation/components/PractitionerQrCode";
import { notFound } from "next/navigation";

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  other: "Otro",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
        {label}
      </dt>
      <dd className="text-sm text-neutral-200">{value}</dd>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await requireUser();
  const repo = new DrizzlePractitionerRepository();
  const practitioner = await repo.findByAuthUserId(user.id);

  if (!practitioner) notFound();

  const gradeLabel = `${GRADE_LABELS[practitioner.grade] ?? practitioner.grade}${practitioner.dan ? ` ${practitioner.dan}° Dan` : ""}`;

  // Derive a short human-readable Kombat ID from the UUID
  const kombatId = `KT-${practitioner.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Mi Perfil
          </h1>
          <p className="text-xs font-mono text-neutral-500 mt-0.5">
            {kombatId}
          </p>
        </div>
        {practitioner.isActive ? (
          <span className="bg-success-900/50 text-success-400 border border-success-800 px-2.5 py-0.5 rounded-full text-xs shrink-0">
            Activo
          </span>
        ) : (
          <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2.5 py-0.5 rounded-full text-xs shrink-0">
            Inactivo
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal data */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-700 rounded-xl p-6 space-y-5">
          <h2 className="text-sm font-semibold text-neutral-50">
            Datos personales
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Nombre completo" value={practitioner.fullName} />
            <Field label="RUT" value={practitioner.rut} />
            <Field label="Fecha de nacimiento" value={practitioner.birthDate} />
            <Field
              label="Género"
              value={GENDER_LABELS[practitioner.gender] ?? practitioner.gender}
            />
            <Field label="Grado actual" value={gradeLabel} />
            <Field label="Fecha de inicio" value={practitioner.startDate} />
            {practitioner.weightKg && (
              <Field label="Peso" value={`${practitioner.weightKg} kg`} />
            )}
            {practitioner.role && (
              <Field
                label="Rol"
                value={<span className="capitalize">{practitioner.role}</span>}
              />
            )}
          </dl>
        </div>

        {/* QR Code */}
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 flex flex-col items-center gap-4">
          <div className="w-full flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-50">Código QR</h2>
            <span className="text-xs font-mono text-neutral-500">
              {kombatId}
            </span>
          </div>
          <div className="bg-white p-3 rounded-xl">
            <PractitionerQrCode
              qrToken={practitioner.qrToken}
              practitionerName={practitioner.fullName}
            />
          </div>
          <p className="text-xs text-neutral-500 text-center leading-relaxed">
            Muestra este código para verificar tu identidad en eventos y
            exámenes
          </p>
        </div>

        {/* Contact */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-700 rounded-xl p-6 space-y-5">
          <h2 className="text-sm font-semibold text-neutral-50">Contacto</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field
              label="Email de contacto"
              value={
                practitioner.contactEmail ?? (
                  <span className="text-neutral-600">No registrado</span>
                )
              }
            />
            <Field
              label="Teléfono"
              value={
                practitioner.contactPhone ?? (
                  <span className="text-neutral-600">No registrado</span>
                )
              }
            />
          </dl>
        </div>

        {/* Deactivation info */}
        {!practitioner.isActive && practitioner.deactivatedAt && (
          <div className="lg:col-span-3 bg-error-500/5 border border-error-500/20 rounded-xl p-6 space-y-3">
            <h2 className="text-sm font-semibold text-error-400">
              Cuenta desactivada
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Fecha de desactivación"
                value={practitioner.deactivatedAt}
              />
              <Field
                label="Motivo"
                value={practitioner.deactivationReason ?? "—"}
              />
            </dl>
          </div>
        )}
      </div>
    </main>
  );
}

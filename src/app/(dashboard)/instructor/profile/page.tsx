import { requireUser } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { isInstructorRole } from "@/lib/roles";
import { EditProfileForm } from "./EditProfileForm";
import { CertificateDownloadButton } from "@/modules/practitioner-identity/presentation/components/CertificateDownloadButton";

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
        {label}
      </dt>
      <dd className="text-sm text-neutral-200">
        {value ?? <span className="text-neutral-600">—</span>}
      </dd>
    </div>
  );
}

export default async function InstructorProfilePage() {
  const user = await requireUser();

  const { data: practitionerRow } = await adminSupabase
    .from("practitioners")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!practitionerRow || !isInstructorRole(practitionerRow.role as string)) {
    redirect("/instructor");
  }

  const repo = new DrizzlePractitionerRepository();
  const practitioner = await repo.findByAuthUserId(user.id);
  if (!practitioner) redirect("/instructor");

  const gradeLabel = `${GRADE_LABELS[practitioner.grade] ?? practitioner.grade}${practitioner.dan ? ` ${practitioner.dan}° Dan` : ""}`;
  const kombatId = `KT-${practitioner.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
        <span className="bg-indigo-900/40 text-indigo-300 border border-indigo-700/40 px-2.5 py-0.5 rounded-full text-xs capitalize shrink-0">
          {practitioner.role ?? "Instructor"}
        </span>
      </div>

      {/* Read-only data */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-neutral-50">
          Datos del practicante
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          <Field label="RUT" value={practitioner.rut} />
          <Field label="Grado" value={gradeLabel} />
          <Field label="Fecha de inicio" value={practitioner.startDate} />
        </dl>
        <p className="text-xs text-neutral-500">
          El RUT y grado solo pueden ser modificados por un administrador.
        </p>
      </div>

      {/* Editable data */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-neutral-50">
          Editar información personal y de contacto
        </h2>
        <EditProfileForm
          practitioner={{
            fullName: practitioner.fullName,
            birthDate: practitioner.birthDate,
            gender: practitioner.gender,
            contactPhone: practitioner.contactPhone,
            contactEmail: practitioner.contactEmail,
            addressStreet: practitioner.addressStreet,
            addressCity: practitioner.addressCity,
            addressRegion: practitioner.addressRegion,
          }}
        />
      </div>

      {/* Membership certificate */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-50">
            Certificado de membresía
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Documento oficial que acredita tu membresía en Kombat Taekwondo
            Chile.
          </p>
        </div>
        <CertificateDownloadButton
          practitionerId={practitioner.id}
          hasCertificate={!!practitioner.certificatePath}
        />
      </div>
    </main>
  );
}

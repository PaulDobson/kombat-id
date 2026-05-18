import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleCertificationRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleCertificationRepository";
import { DrizzleMartialHistoryRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleMartialHistoryRepository";
import Link from "next/link";
import { DeactivateButton } from "./DeactivateButton";
import { ActivateButton } from "./ActivateButton";
import { ROLE_LABELS } from "@/lib/roles";

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

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const GRADE_LABELS: Record<string, string> = {
  white: "Blanco",
  yellow: "Amarillo",
  green: "Verde",
  blue: "Azul",
  red: "Rojo",
  black: "Negro",
};

const GRADE_STYLES: Record<string, string> = {
  white: "bg-neutral-700 text-neutral-200 border border-neutral-600",
  yellow: "bg-yellow-900/50 text-yellow-400 border border-yellow-800",
  green: "bg-green-900/50 text-green-400 border border-green-800",
  blue: "bg-blue-900/50 text-blue-400 border border-blue-800",
  red: "bg-red-900/50 text-red-400 border border-red-800",
  black: "bg-neutral-800 text-neutral-100 border border-neutral-600",
};

const BELT_COLORS: Record<string, string> = {
  white: "bg-neutral-100",
  yellow: "bg-yellow-400",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  red: "bg-red-500",
  black: "bg-neutral-900 border border-neutral-600",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  other: "Otro",
};

const CERT_TYPE_LABELS: Record<string, string> = {
  technical_grade: "Grado técnico",
  instructor: "Instructor",
  referee: "Árbitro",
  coach: "Entrenador",
  event_participation: "Participación en evento",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  competition: "Competencia",
  seminar: "Seminario",
  exam: "Examen",
};

const EVENT_TYPE_STYLES: Record<string, string> = {
  competition: "bg-primary-900/50 text-primary-400 border border-primary-800",
  seminar: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  exam: "bg-emerald-900/50 text-emerald-400 border border-emerald-800",
};

import { formatDateLong } from "@/lib/format-date";
function formatDate(iso: string | null) {
  if (!iso) return "—";
  return formatDateLong(iso.slice(0, 10));
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-neutral-200">
        {value ?? <span className="text-neutral-600">—</span>}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminPractitionerDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const adminUser = await requireAdminUser();
  const { publicId } = await params;

  const practitionerRepo = new DrizzlePractitionerRepository();
  const certRepo = new DrizzleCertificationRepository();
  const historyRepo = new DrizzleMartialHistoryRepository();

  const [practitioner, certifications, historyEntries] = await Promise.all([
    practitionerRepo.findById(publicId),
    certRepo.findByPractitioner(publicId),
    historyRepo.findByPractitionerId(publicId),
  ]);

  if (!practitioner) notFound();

  // Fetch academy membership and instructor name
  const [{ data: membership }, instructorData] = await Promise.all([
    adminSupabase
      .from("academy_memberships")
      .select("academies(id, name)")
      .eq("practitioner_id", publicId)
      .eq("is_active", true)
      .maybeSingle(),
    practitioner.instructorId
      ? practitionerRepo.findById(practitioner.instructorId)
      : Promise.resolve(null),
  ]);

  const academy = membership?.academies as { id: string; name: string } | null;
  const gradeLabel = `${GRADE_LABELS[practitioner.grade] ?? practitioner.grade}${practitioner.dan ? ` ${practitioner.dan}° Dan` : ""}`;
  const activeCerts = certifications.filter((c) => !c.isRevoked);
  const recentHistory = historyEntries.slice(0, 5);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/admin/practitioners"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        ← Volver al listado
      </Link>

      {/* Hero card */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Belt indicator */}
          <div
            className={`w-16 h-16 rounded-full shrink-0 flex items-center justify-center ${BELT_COLORS[practitioner.grade]}`}
          >
            <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              {practitioner.grade === "black"
                ? `${practitioner.dan ?? 1}D`
                : practitioner.grade.slice(0, 3).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
                {practitioner.fullName}
              </h1>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${GRADE_STYLES[practitioner.grade]}`}
              >
                {gradeLabel}
              </span>
              {practitioner.isActive ? (
                <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full text-xs">
                  Activo
                </span>
              ) : (
                <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
                  Inactivo
                </span>
              )}
              {practitioner.role && (
                <span className="bg-primary-900/40 text-primary-400 border border-primary-800 px-2 py-0.5 rounded-full text-xs capitalize">
                  {ROLE_LABELS[practitioner.role] ?? practitioner.role}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-400">
              RUT: {practitioner.rut}
              {academy && (
                <>
                  {" "}
                  ·{" "}
                  <Link
                    href={`/admin/academies/${academy.id}`}
                    className="text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    {academy.name}
                  </Link>
                </>
              )}
              {instructorData && <> · Instructor: {instructorData.fullName}</>}
            </p>
          </div>

          {/* Admin actions */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              href={`/admin/practitioners/${publicId}/grade`}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              Actualizar grado
            </Link>
            <Link
              href={`/admin/practitioners/${publicId}/certifications/new`}
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              Emitir certificación
            </Link>
            {practitioner.isActive && (
              <DeactivateButton publicId={publicId} adminId={adminUser.id} />
            )}
            {!practitioner.isActive && practitioner.instructorId && (
              <ActivateButton publicId={publicId} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: personal data + address */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal data */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-neutral-50 mb-4">
              Datos personales
            </h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field
                label="Fecha de nacimiento"
                value={formatDate(practitioner.birthDate)}
              />
              <Field
                label="Género"
                value={
                  GENDER_LABELS[practitioner.gender] ?? practitioner.gender
                }
              />
              <Field
                label="Fecha de inicio"
                value={formatDate(practitioner.startDate)}
              />
              {practitioner.weightKg && (
                <Field label="Peso" value={`${practitioner.weightKg} kg`} />
              )}
              {practitioner.heightCm && (
                <Field label="Estatura" value={`${practitioner.heightCm} cm`} />
              )}
              {practitioner.contactEmail && (
                <Field label="Email" value={practitioner.contactEmail} />
              )}
              {practitioner.contactPhone && (
                <Field label="Teléfono" value={practitioner.contactPhone} />
              )}
            </dl>
          </div>

          {/* Address */}
          {(practitioner.addressStreet ||
            practitioner.addressCity ||
            practitioner.addressRegion) && (
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-neutral-50 mb-4">
                Dirección
              </h2>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {practitioner.addressStreet && (
                  <Field label="Calle" value={practitioner.addressStreet} />
                )}
                {practitioner.addressCity && (
                  <Field label="Ciudad" value={practitioner.addressCity} />
                )}
                {practitioner.addressRegion && (
                  <Field label="Región" value={practitioner.addressRegion} />
                )}
              </dl>
            </div>
          )}

          {/* Deactivation info */}
          {!practitioner.isActive && practitioner.deactivatedAt && (
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-rose-400 mb-4">
                Cuenta desactivada
              </h2>
              <dl className="grid grid-cols-2 gap-4">
                <Field
                  label="Fecha"
                  value={formatDate(practitioner.deactivatedAt)}
                />
                <Field label="Motivo" value={practitioner.deactivationReason} />
              </dl>
            </div>
          )}

          {/* Martial history */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-50">
                Historial marcial ({historyEntries.length})
              </h2>
            </div>
            {recentHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-500 text-sm">
                  Sin entradas en el historial.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Resultado
                    </th>
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      Notas
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {recentHistory.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="px-5 py-3 text-neutral-300 tabular-nums text-xs">
                        {formatDate(entry.eventDate)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_TYPE_STYLES[entry.eventType] ?? "bg-neutral-800 text-neutral-400 border border-neutral-700"}`}
                        >
                          {EVENT_TYPE_LABELS[entry.eventType] ??
                            entry.eventType}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-neutral-400 text-xs hidden sm:table-cell">
                        {entry.result ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-neutral-500 text-xs hidden md:table-cell max-w-xs truncate">
                        {entry.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {historyEntries.length > 5 && (
              <div className="px-5 py-3 border-t border-neutral-700">
                <p className="text-xs text-neutral-500">
                  Mostrando 5 de {historyEntries.length} entradas
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: stats + certifications */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Eventos
              </p>
              <p className="text-2xl font-bold text-primary-400 mt-1">
                {historyEntries.length}
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Certs.
              </p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {activeCerts.length}
              </p>
            </div>
          </div>

          {/* Certifications */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-50">
                Certificaciones
              </h2>
              <Link
                href={`/admin/practitioners/${publicId}/certifications/new`}
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                + Emitir
              </Link>
            </div>
            {certifications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-500 text-sm">Sin certificaciones.</p>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-800">
                {certifications.map((cert) => (
                  <li
                    key={cert.id}
                    className="px-5 py-3 flex items-start gap-3"
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${cert.isRevoked ? "bg-rose-500" : "bg-emerald-500"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-200">
                        {CERT_TYPE_LABELS[cert.certType] ?? cert.certType}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {formatDate(cert.issuedAt)}
                      </p>
                      {cert.isRevoked && (
                        <p className="text-xs text-rose-400 mt-0.5">
                          Revocada · {cert.revocationReason}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick links */}
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-2">
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Acciones rápidas
            </h2>
            <Link
              href={`/admin/practitioners/${publicId}/grade`}
              className="flex items-center justify-between w-full px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-200 transition-colors"
            >
              <span>Actualizar grado</span>
              <span className="text-neutral-500">→</span>
            </Link>
            <Link
              href={`/admin/practitioners/${publicId}/certifications/new`}
              className="flex items-center justify-between w-full px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-200 transition-colors"
            >
              <span>Emitir certificación</span>
              <span className="text-neutral-500">→</span>
            </Link>
            {academy && (
              <Link
                href={`/admin/academies/${academy.id}`}
                className="flex items-center justify-between w-full px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-200 transition-colors"
              >
                <span>Ver academia</span>
                <span className="text-neutral-500">→</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

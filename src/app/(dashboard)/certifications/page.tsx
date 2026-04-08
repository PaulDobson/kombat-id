import { requireUser } from "@/lib/supabase/server";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleCertificationRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleCertificationRepository";
import { notFound } from "next/navigation";
import Link from "next/link";

const CERT_TYPE_LABELS: Record<string, string> = {
  technical_grade: "Grado Técnico",
  instructor: "Instructor",
  referee: "Árbitro",
  coach: "Entrenador",
  event_participation: "Participación en Evento",
};

const CERT_TYPE_STYLES: Record<string, string> = {
  technical_grade:
    "bg-primary-900/50 text-primary-400 border border-primary-800",
  instructor: "bg-success-900/50 text-success-400 border border-success-800",
  referee: "bg-warning-500/10 text-warning-400 border border-warning-500/30",
  coach: "bg-info-500/10 text-info-400 border border-info-500/30",
  event_participation:
    "bg-neutral-800 text-neutral-400 border border-neutral-700",
};

import { formatDateLong as formatDate } from "@/lib/format-date";

export default async function CertificationsPage() {
  const user = await requireUser();
  const practitionerRepo = new DrizzlePractitionerRepository();
  const certRepo = new DrizzleCertificationRepository();

  const practitioner = await practitionerRepo.findByAuthUserId(user.id);
  if (!practitioner) notFound();

  const certifications = await certRepo.findByPractitioner(practitioner.id);
  const active = certifications.filter((c) => !c.isRevoked);
  const revoked = certifications.filter((c) => c.isRevoked);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
            Certificaciones
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            {active.length} vigente{active.length !== 1 ? "s" : ""}
            {revoked.length > 0 &&
              ` · ${revoked.length} revocada${revoked.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {certifications.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-12 text-center">
          <p className="text-neutral-500 text-sm">
            No tienes certificaciones emitidas.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active */}
          {active.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Vigentes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((cert) => (
                  <div
                    key={cert.id}
                    className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CERT_TYPE_STYLES[cert.certType] ?? CERT_TYPE_STYLES.event_participation}`}
                      >
                        {CERT_TYPE_LABELS[cert.certType] ?? cert.certType}
                      </span>
                      <span className="bg-success-900/50 text-success-400 border border-success-800 px-2 py-0.5 rounded-full text-xs shrink-0">
                        Vigente
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Emitida el</p>
                      <p className="text-sm text-neutral-200">
                        {formatDate(cert.issuedAt)}
                      </p>
                    </div>
                    {cert.notes && (
                      <p className="text-xs text-neutral-500 italic">
                        {cert.notes}
                      </p>
                    )}
                    <Link
                      href={`/verify/cert/${cert.id}`}
                      className="block text-xs text-primary-400 hover:text-primary-300 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Verificar →
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Revoked */}
          {revoked.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Revocadas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {revoked.map((cert) => (
                  <div
                    key={cert.id}
                    className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-3 opacity-60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {CERT_TYPE_LABELS[cert.certType] ?? cert.certType}
                      </span>
                      <span className="bg-error-500/10 text-error-400 border border-error-500/30 px-2 py-0.5 rounded-full text-xs shrink-0">
                        Revocada
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Emitida el</p>
                      <p className="text-sm text-neutral-400">
                        {formatDate(cert.issuedAt)}
                      </p>
                    </div>
                    {cert.revokedAt && (
                      <div>
                        <p className="text-xs text-neutral-500">Revocada el</p>
                        <p className="text-sm text-neutral-400">
                          {formatDate(cert.revokedAt)}
                        </p>
                      </div>
                    )}
                    {cert.revocationReason && (
                      <p className="text-xs text-neutral-500">
                        {cert.revocationReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

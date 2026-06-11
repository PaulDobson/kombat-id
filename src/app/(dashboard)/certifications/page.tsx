import { requireUser } from "@/lib/supabase/server";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleCertificationRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleCertificationRepository";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Award,
  ExternalLink,
  QrCode,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { CERT_TYPE_LABELS } from "@/lib/presentation-constants";
import { formatDateLong as formatDate } from "@/lib/format-date";

const CERT_TYPE_STYLES: Record<string, string> = {
  technical_grade:
    "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20",
  instructor: "bg-blue-400/10 text-blue-400 border border-blue-400/20",
  referee: "bg-purple-400/10 text-purple-400 border border-purple-400/20",
  coach: "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20",
  event_participation:
    "bg-neutral-700/50 text-neutral-400 border border-neutral-600",
};

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
      {/* Header */}
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

      {certifications.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-12 text-center space-y-2">
          <Award className="w-10 h-10 text-neutral-700 mx-auto" />
          <p className="text-neutral-500 text-sm">
            No tienes certificaciones emitidas.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active certifications */}
          {active.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Vigentes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((cert) => {
                  const typeStyle =
                    CERT_TYPE_STYLES[cert.certType] ??
                    CERT_TYPE_STYLES.event_participation;
                  const typeLabel =
                    CERT_TYPE_LABELS[cert.certType] ?? cert.certType;
                  const verifyUrl = `/verify/cert/${cert.id}`;

                  return (
                    <div
                      key={cert.id}
                      className="bg-neutral-900 border border-neutral-700 hover:border-neutral-600 rounded-xl p-5 flex flex-col gap-4 transition-colors"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${typeStyle}`}
                        >
                          <CheckCircle className="w-3 h-3" />
                          {typeLabel}
                        </span>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-xs shrink-0">
                          Vigente
                        </span>
                      </div>

                      {/* Date */}
                      <div>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-0.5">
                          Emitida el
                        </p>
                        <p className="text-sm text-neutral-200">
                          {formatDate(cert.issuedAt)}
                        </p>
                      </div>

                      {cert.notes && (
                        <p className="text-xs text-neutral-500 italic leading-relaxed">
                          {cert.notes}
                        </p>
                      )}

                      {/* Verify CTA — prominent */}
                      <div className="mt-auto pt-3 border-t border-neutral-800 flex items-center gap-2">
                        <Link
                          href={verifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:border-neutral-600 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Verificar
                        </Link>
                        <Link
                          href={`${verifyUrl}#qr`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 rounded-lg transition-colors"
                          title="Ver código QR"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span className="sr-only">Ver QR</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Revoked certifications */}
          {revoked.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Revocadas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {revoked.map((cert) => (
                  <div
                    key={cert.id}
                    className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 flex flex-col gap-3 opacity-60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 bg-neutral-800 text-neutral-500 border border-neutral-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                        <XCircle className="w-3 h-3" />
                        {CERT_TYPE_LABELS[cert.certType] ?? cert.certType}
                      </span>
                      <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full text-xs shrink-0">
                        Revocada
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-neutral-600 uppercase tracking-wider mb-0.5">
                          Emitida
                        </p>
                        <p className="text-xs text-neutral-400">
                          {formatDate(cert.issuedAt)}
                        </p>
                      </div>
                      {cert.revokedAt && (
                        <div>
                          <p className="text-[10px] text-neutral-600 uppercase tracking-wider mb-0.5">
                            Revocada
                          </p>
                          <p className="text-xs text-neutral-400">
                            {formatDate(cert.revokedAt)}
                          </p>
                        </div>
                      )}
                    </div>

                    {cert.revocationReason && (
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        Motivo: {cert.revocationReason}
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

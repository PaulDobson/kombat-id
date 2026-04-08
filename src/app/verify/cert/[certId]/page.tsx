import { DrizzleCertificationRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleCertificationRepository";
import { verifyCertification } from "@/modules/practitioner-identity/application/use-cases/verifyCertification";
import { CertificationNotFoundError } from "@/modules/practitioner-identity/domain/errors";
import { notFound } from "next/navigation";

const CERT_TYPE_LABELS: Record<string, string> = {
  technical_grade: "Grado Técnico",
  instructor: "Instructor",
  referee: "Árbitro",
  coach: "Entrenador",
  event_participation: "Participación en Evento",
};

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function formatDate(iso: string) {
  // Parse as UTC to avoid timezone shifts between server and client
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return `${day} de ${MONTH_NAMES[month - 1]} de ${year}`;
}

export default async function CertVerificationPage({
  params,
}: {
  params: Promise<{ certId: string }>;
}) {
  const { certId } = await params;

  const certRepo = new DrizzleCertificationRepository();

  let result;
  try {
    result = await verifyCertification(certId, { certificationRepo: certRepo });
  } catch (err) {
    if (err instanceof CertificationNotFoundError) notFound();
    throw err;
  }

  const isRevoked = result.isRevoked;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Brand header */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm" aria-hidden="true">
            KT
          </span>
        </div>
        <span className="font-semibold text-neutral-50 text-base tracking-tight">
          Kombat Taekwondo
        </span>
      </div>

      <main className="w-full max-w-md space-y-4">
        {/* Status banner */}
        {isRevoked ? (
          <div
            role="alert"
            className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-5 py-4 flex items-start gap-3"
          >
            <span
              className="text-rose-400 text-lg leading-none mt-0.5"
              aria-hidden="true"
            >
              ⚠️
            </span>
            <div>
              <p className="text-sm font-semibold text-rose-400">
                Esta certificación ha sido REVOCADA
              </p>
              {result.revocationReason && (
                <p className="text-xs text-rose-300/70 mt-1">
                  Motivo: {result.revocationReason}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-4 flex items-center gap-3">
            <span
              className="text-emerald-400 text-lg leading-none"
              aria-hidden="true"
            >
              ✅
            </span>
            <p className="text-sm font-semibold text-emerald-400">
              Certificación vigente y válida
            </p>
          </div>
        )}

        {/* Certificate card */}
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-700">
            <h1 className="text-sm font-semibold text-neutral-50">
              Verificación de Certificación
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5 font-mono break-all">
              ID: {certId}
            </p>
          </div>

          <dl className="divide-y divide-neutral-800">
            <Row label="Practicante" value={result.practitionerName} />
            <Row
              label="Tipo"
              value={
                <span className="bg-primary-900/50 text-primary-400 border border-primary-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  {CERT_TYPE_LABELS[result.certType] ?? result.certType}
                </span>
              }
            />
            <Row label="Fecha de emisión" value={formatDate(result.issuedAt)} />
            <Row
              label="Estado"
              value={
                isRevoked ? (
                  <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full text-xs font-medium">
                    Revocada
                  </span>
                ) : (
                  <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full text-xs font-medium">
                    Vigente
                  </span>
                )
              }
            />
            {isRevoked && result.revokedAt && (
              <Row
                label="Fecha de revocación"
                value={formatDate(result.revokedAt)}
              />
            )}
          </dl>
        </div>

        <p className="text-center text-xs text-neutral-600">
          Verificación oficial — Kombat Taekwondo
        </p>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5 flex items-center justify-between gap-4">
      <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-neutral-200 text-right">{value}</dd>
    </div>
  );
}

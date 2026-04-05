import { DrizzleCertificationRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleCertificationRepository";
import { verifyCertification } from "@/modules/practitioner-identity/application/use-cases/verifyCertification";
import { CertificationNotFoundError } from "@/modules/practitioner-identity/domain/errors";
import { notFound } from "next/navigation";

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

  return (
    <main>
      <h1>Verificación de Certificación</h1>
      {result.isRevoked && (
        <div role="alert">
          <strong>⚠️ Esta certificación ha sido REVOCADA</strong>
          {result.revocationReason && <p>Motivo: {result.revocationReason}</p>}
        </div>
      )}
      <dl>
        <dt>Practicante</dt>
        <dd>{result.practitionerName}</dd>
        <dt>Tipo</dt>
        <dd>{result.certType}</dd>
        <dt>Emitida</dt>
        <dd>{result.issuedAt}</dd>
        <dt>Estado</dt>
        <dd>{result.isRevoked ? "❌ Revocada" : "✅ Vigente"}</dd>
        {result.isRevoked && result.revokedAt && (
          <>
            <dt>Revocada el</dt>
            <dd>{result.revokedAt}</dd>
          </>
        )}
      </dl>
    </main>
  );
}

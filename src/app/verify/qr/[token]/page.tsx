import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleQrScanRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleQrScanRepository";
import { verifyByQrToken } from "@/modules/practitioner-identity/application/use-cases/verifyByQrToken";
import { PractitionerNotFoundError } from "@/modules/practitioner-identity/domain/errors";
import { notFound } from "next/navigation";
import Image from "next/image";

export default async function QrVerificationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const practitionerRepo = new DrizzlePractitionerRepository();
  const qrScanRepo = new DrizzleQrScanRepository();

  let result;
  try {
    result = await verifyByQrToken(token, { practitionerRepo, qrScanRepo });
  } catch (err) {
    if (err instanceof PractitionerNotFoundError) notFound();
    throw err;
  }

  return (
    <main>
      <h1>Verificación de Identidad</h1>
      {!result.isActive && (
        <div role="alert">
          <strong>⚠️ Practicante INACTIVO</strong>
        </div>
      )}
      <dl>
        <dt>Nombre</dt>
        <dd>{result.fullName}</dd>
        <dt>Grado</dt>
        <dd>{result.grade}</dd>
        <dt>Estado</dt>
        <dd>{result.isActive ? "✅ Activo" : "❌ Inactivo"}</dd>
      </dl>
      {result.photoPath && (
        <Image
          src={result.photoPath}
          alt={`Foto de ${result.fullName}`}
          width={200}
          height={200}
        />
      )}
    </main>
  );
}

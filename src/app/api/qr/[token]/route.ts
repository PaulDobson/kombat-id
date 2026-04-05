import { NextRequest, NextResponse } from "next/server";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleQrScanRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleQrScanRepository";
import { verifyByQrToken } from "@/modules/practitioner-identity/application/use-cases/verifyByQrToken";
import { PractitionerNotFoundError } from "@/modules/practitioner-identity/domain/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const practitionerRepo = new DrizzlePractitionerRepository();
  const qrScanRepo = new DrizzleQrScanRepository();

  try {
    const result = await verifyByQrToken(token, {
      practitionerRepo,
      qrScanRepo,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PractitionerNotFoundError) {
      return NextResponse.json(
        { error: "QR token no encontrado" },
        { status: 404 },
      );
    }
    console.error("[GET /api/qr/[token]] Unexpected error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

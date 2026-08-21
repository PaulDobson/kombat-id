import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";

function resolvePublicAssetPath(fileName: string): string {
  const candidates = [
    path.join(process.cwd(), "public", "images", fileName),
    path.join(process.cwd(), "public", fileName),
    path.resolve(process.cwd(), "..", "public", "images", fileName),
    path.resolve(process.cwd(), "..", "public", fileName),
    path.resolve(__dirname, "../../../../public", "images", fileName),
    path.resolve(__dirname, "../../../../public", fileName),
  ];

  const resolved = candidates.find((candidate) => fs.existsSync(candidate));
  if (!resolved) {
    throw new Error(
      `No se encontró el asset "${fileName}" en ninguna ruta esperada: ${candidates.join(", ")}`,
    );
  }

  return resolved;
}

function readAssetAsDataUrl(fileName: string, mimeType: string): string {
  const filePath = resolvePublicAssetPath(fileName);
  const buffer = fs.readFileSync(filePath);
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

import { adminSupabase } from "@/lib/supabase/admin";
import { MembershipCertificate } from "../../presentation/components/MembershipCertificate";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRADE_LABELS: Record<string, string> = {
  white: "Cinturón Blanco",
  yellow: "Cinturón Amarillo",
  green: "Cinturón Verde",
  blue: "Cinturón Azul",
  red: "Cinturón Rojo",
  black: "Cinturón Negro",
};

const BUCKET = "membership-certificates";

// ---------------------------------------------------------------------------
// generateAndStoreMembershipCertificate
//
// Genera el PDF de certificado de membresía para un practicante, lo sube al
// bucket de Supabase Storage y guarda la ruta en la columna certificate_path
// de la tabla practitioners.
//
// Devuelve el Buffer del PDF para que el llamador pueda enviarlo directamente
// al cliente si lo necesita.
// ---------------------------------------------------------------------------

export async function generateAndStoreMembershipCertificate(
  publicId: string,
): Promise<Buffer> {
  // Fetch practitioner data
  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("id, full_name, grade, dan, qr_token")
    .eq("id", publicId)
    .maybeSingle();

  if (!practitioner) {
    throw new Error(`Practicante no encontrado: ${publicId}`);
  }

  // Fetch active academy membership
  const { data: membership } = await adminSupabase
    .from("academy_memberships")
    .select("academies(name, city)")
    .eq("practitioner_id", publicId)
    .maybeSingle();

  const academy = membership?.academies as {
    name: string;
    city: string | null;
  } | null;

  // Generate QR code as base64 data URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const verifyUrl = `${siteUrl}/verify/qr/${practitioner.qr_token}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 200,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  // Build grade label
  const gradeLabel = `${GRADE_LABELS[practitioner.grade] ?? practitioner.grade}${
    practitioner.dan ? ` ${practitioner.dan}° Dan` : ""
  }`;

  // Member ID
  const memberId = `KMBT-${practitioner.id
    .replace(/-/g, "")
    .slice(0, 4)
    .toUpperCase()}-${practitioner.id
    .replace(/-/g, "")
    .slice(4, 8)
    .toUpperCase()}`;

  // Activation date
  const activationDate = new Date().toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Resolve public assets from a few valid serverless deployment paths.
  const logoDataUrl = readAssetAsDataUrl("KombatLogo_H.png", "image/png");

  // Signature image — Juan Marcelo Gallardo (Presidente)
  const signatureDataUrl = readAssetAsDataUrl("firma_1.jpeg", "image/jpeg");

  // Signature image 2 — Juan Riquelme Pavez (Director Educacional)
  const signatureDataUrl2 = readAssetAsDataUrl("firma_juan.jpeg", "image/jpeg");

  // Generate PDF buffer
  const pdfBuffer = await renderToBuffer(
    <MembershipCertificate
      fullName={practitioner.full_name}
      gradeLabel={gradeLabel}
      academyName={academy?.name ?? "Kombat Taekwondo Chile"}
      academyCity={academy?.city ?? null}
      memberId={memberId}
      activationDate={activationDate}
      qrDataUrl={qrDataUrl}
      logoUrl={logoDataUrl}
      signatureUrl={signatureDataUrl}
      signatureUrl2={signatureDataUrl2}
    />,
  );

  // Upload to Supabase Storage
  const storagePath = `${publicId}/membership-certificate.pdf`;

  const { error: uploadError } = await adminSupabase.storage
    .from(BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error(
      "[membershipCertificateService] Error al subir a storage:",
      uploadError.message,
    );
  } else {
    // Persist the storage path so the practitioner can download it later
    const { error: updateError } = await adminSupabase
      .from("practitioners")
      .update({
        certificate_path: storagePath,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", publicId);

    if (updateError) {
      console.error(
        "[membershipCertificateService] Error al guardar certificate_path:",
        updateError.message,
      );
    }
  }

  return pdfBuffer;
}

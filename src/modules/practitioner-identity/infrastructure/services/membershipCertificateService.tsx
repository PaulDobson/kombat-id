import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";

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
    .eq("is_active", true)
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

  // Logo — read from filesystem to avoid HTTP round-trip in server context
  const logoPath = path.join(
    process.cwd(),
    "public",
    "images",
    "KombatLogo_H.png",
  );
  const logoBase64 = fs.readFileSync(logoPath).toString("base64");
  const logoDataUrl = `data:image/png;base64,${logoBase64}`;

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

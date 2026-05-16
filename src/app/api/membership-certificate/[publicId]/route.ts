import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import QRCode from "qrcode";
import { MembershipCertificate } from "@/modules/practitioner-identity/presentation/components/MembershipCertificate";
import path from "path";
import fs from "fs";

// ---------------------------------------------------------------------------
// Auth guard — admin only
// ---------------------------------------------------------------------------

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await adminSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return data ? user : null;
}

// ---------------------------------------------------------------------------
// Grade labels
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
// Route handler — GET generates (or retrieves cached) certificate
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { publicId } = await params;

  // Fetch practitioner data
  const { data: practitioner } = await adminSupabase
    .from("practitioners")
    .select("id, full_name, grade, dan, qr_token")
    .eq("id", publicId)
    .maybeSingle();

  if (!practitioner) {
    return new NextResponse("Practicante no encontrado", { status: 404 });
  }

  // Fetch academy
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
  const verifyUrl = `${siteUrl}/verify/${practitioner.qr_token}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 200,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  // Build grade label
  const gradeLabel = `${GRADE_LABELS[practitioner.grade] ?? practitioner.grade}${practitioner.dan ? ` ${practitioner.dan}° Dan` : ""}`;

  // Member ID
  const memberId = `KMBT-${practitioner.id.replace(/-/g, "").slice(0, 4).toUpperCase()}-${practitioner.id.replace(/-/g, "").slice(4, 8).toUpperCase()}`;

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
  // Cast needed: renderToBuffer expects ReactElement<DocumentProps>, but
  // MembershipCertificate is a wrapper component with its own props.
  const pdfBuffer = await renderToBuffer(
    createElement(MembershipCertificate, {
      fullName: practitioner.full_name,
      gradeLabel,
      academyName: academy?.name ?? "Kombat Taekwondo Chile",
      academyCity: academy?.city ?? null,
      memberId,
      activationDate,
      qrDataUrl,
      logoUrl: logoDataUrl,
    }) as unknown as Parameters<typeof renderToBuffer>[0],
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
      "[membership-certificate] Storage upload error:",
      uploadError.message,
    );
  }

  // Return the PDF directly regardless of upload success
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-membresia-${memberId}.pdf"`,
    },
  });
}

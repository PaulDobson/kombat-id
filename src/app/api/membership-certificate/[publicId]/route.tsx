import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { generateAndStoreMembershipCertificate } from "@/modules/practitioner-identity/infrastructure/services/membershipCertificateService";

// Forzar renderizado dinámico para evitar caché de URLs de Supabase Storage
export const dynamic = "force-dynamic";

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
// Route handler — GET regenera el certificado y lo devuelve como PDF
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

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateAndStoreMembershipCertificate(publicId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    if (message.includes("no encontrado")) {
      return new NextResponse("Practicante no encontrado", { status: 404 });
    }
    console.error(
      "[membership-certificate] Error al generar certificado:",
      err,
    );
    return new NextResponse("Error al generar el certificado", { status: 500 });
  }

  const memberId = `KMBT-${publicId.replace(/-/g, "").slice(0, 4).toUpperCase()}-${publicId.replace(/-/g, "").slice(4, 8).toUpperCase()}`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-membresia-${memberId}.pdf"`,
    },
  });
}

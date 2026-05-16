"use server";

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

const BUCKET = "membership-certificates";

// ---------------------------------------------------------------------------
// Get a short-lived signed URL for the practitioner's membership certificate.
// The caller must be the owner of the certificate (matched by auth_user_id)
// or an admin.
// ---------------------------------------------------------------------------

export async function getMembershipCertificateUrlAction(
  practitionerId: string,
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autenticado", code: "UNAUTHORIZED" };
  }

  // Verify the requester owns this practitioner record or is an admin
  const [{ data: practitioner }, { data: adminRow }] = await Promise.all([
    adminSupabase
      .from("practitioners")
      .select("id, auth_user_id, certificate_path")
      .eq("id", practitionerId)
      .maybeSingle(),
    adminSupabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const isAdmin = !!adminRow;
  const isOwner = practitioner?.auth_user_id === user.id;

  if (!isAdmin && !isOwner) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  if (!practitioner?.certificate_path) {
    return {
      success: false,
      error: "El certificado aún no ha sido generado",
      code: "NOT_FOUND",
    };
  }

  const { data: signedUrl, error } = await adminSupabase.storage
    .from(BUCKET)
    .createSignedUrl(practitioner.certificate_path as string, 300); // 5 min

  if (error || !signedUrl?.signedUrl) {
    console.error(
      "[getMembershipCertificateUrlAction] Storage error:",
      error?.message,
    );
    return {
      success: false,
      error: "No se pudo generar el enlace de descarga",
      code: "INTERNAL_ERROR",
    };
  }

  return { success: true, data: { url: signedUrl.signedUrl } };
}

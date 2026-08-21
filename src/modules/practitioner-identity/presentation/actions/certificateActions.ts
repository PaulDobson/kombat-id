"use server";

import { createClient } from "@/lib/supabase/server";
import { createPractitionerIdentityAdminClient } from "./_practitionerIdentityDeps";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

// ---------------------------------------------------------------------------
// Get a short-lived signed URL for the practitioner's membership certificate.
// The caller must be the owner of the certificate (matched by auth_user_id)
// or an admin.
// ---------------------------------------------------------------------------

export async function getMembershipCertificateUrlAction(
  practitionerId: string,
): Promise<ActionResult<{ url: string }>> {
  const adminClient = createPractitionerIdentityAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autenticado", code: "UNAUTHORIZED" };
  }

  // Verify the requester owns this practitioner record or is an admin
  const [{ data: practitioner }, { data: adminRow }] = await Promise.all([
    adminClient
      .from("practitioners")
      .select("id, auth_user_id, certificate_path")
      .eq("id", practitionerId)
      .maybeSingle(),
    adminClient
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

  // Evitamos devolver una URL firmada de Supabase Storage porque con Next.js
  // y URLs de objetos privados se pueden disparar errores de cache key en el
  // optimizador de imágenes. La descarga se hace a través de la ruta interna
  // que genera/renderiza el PDF directamente sin pasar por un asset externo.
  return {
    success: true,
    data: { url: `/api/membership-certificate/${practitionerId}` },
  };
}

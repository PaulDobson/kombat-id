import { adminSupabase } from "@/lib/supabase/admin";

export interface ResolveStudentAuthAccountResult {
  authUserId: string | undefined;
  temporaryPassword?: string;
}

/**
 * Genera una contraseña temporal legible, sin caracteres ambiguos (0/O, 1/l).
 */
function generateTemporaryPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => chars[b % chars.length])
    .join("");
}

/**
 * Resuelve o crea una cuenta Supabase Auth para el email de un alumno.
 *
 * - Si ya existe una cuenta para el email, retorna su ID (sin temporaryPassword).
 * - Si no existe, crea la cuenta con contraseña temporal y retorna el ID + la contraseña.
 *   El caller es responsable de enviar el email de bienvenida con las credenciales.
 * - Si la creación falla, retorna undefined (no-fatal: el perfil del practicante
 *   igual se crea y el alumno puede vincular su cuenta manualmente después).
 *
 * Usa la Admin REST API de Supabase para buscar al usuario por email en O(1),
 * ya que @supabase/supabase-js v2 no expone getUserByEmail en el cliente admin.
 */
export async function resolveStudentAuthAccount(
  email: string,
): Promise<ResolveStudentAuthAccountResult> {
  // Look up the user by email via the Admin REST API (O(1) — no full user list download)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const response = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    },
  );

  if (response.ok) {
    const body = (await response.json()) as {
      users?: Array<{ id: string; email?: string }>;
    };
    const match = body.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) {
      return { authUserId: match.id };
    }
  }

  // No account yet — crear cuenta con contraseña temporal y enviar email personalizado.
  // Se usa createUser en lugar de inviteUserByEmail para evitar el email nativo de
  // Supabase que incluye un enlace con caducidad de 24 horas.
  // El alumno recibe sus credenciales directamente y accede con usuario + contraseña.
  const temporaryPassword = generateTemporaryPassword();

  const { data: createdUser, error: createError } =
    await adminSupabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true, // No requiere confirmación de email — el instructor ya validó el correo
      user_metadata: {
        role: "alumno",
        must_change_password: true,
      },
      app_metadata: {
        role: "alumno",
      },
    });

  if (createError || !createdUser?.user) {
    console.error(
      "[resolveStudentAuthAccount] Failed to create auth user:",
      createError?.message,
    );
    // Non-fatal: practitioner profile is still created
    return { authUserId: undefined };
  }

  return { authUserId: createdUser.user.id, temporaryPassword };
}

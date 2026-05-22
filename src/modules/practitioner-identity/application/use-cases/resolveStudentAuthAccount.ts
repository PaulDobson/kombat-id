import { adminSupabase } from "@/lib/supabase/admin";
import { requireEnv } from "@/lib/config";

export interface ResolveStudentAuthAccountResult {
  authUserId: string | undefined;
}

/**
 * Resolves or creates a Supabase Auth account for a student email.
 *
 * - If an account already exists for the email, returns its ID.
 * - If no account exists, sends a Supabase invitation email and returns the
 *   new user's ID.
 * - If the invite fails, returns undefined (non-fatal: the practitioner profile
 *   is still created and auto-linking happens when the student activates their
 *   account via email).
 *
 * Uses the Supabase Admin REST API directly to look up a user by email in O(1),
 * since @supabase/supabase-js v2 does not expose a getUserByEmail method on the
 * admin client.
 */
export async function resolveStudentAuthAccount(
  email: string,
): Promise<ResolveStudentAuthAccountResult> {
  // Look up the user by email via the Admin REST API (O(1) — no full user list download)
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

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

  // No account yet — invite via Supabase.
  // This creates the user as pending confirmation and triggers
  // Supabase's native invitation email with an activation link.
  // The user sets their own password when they click the link.
  //
  // inviteUserByEmail does NOT support PKCE — Supabase uses the implicit flow
  // and redirects to the Site URL with tokens in the URL hash fragment
  // (#access_token=...&type=invite). Hash fragments are never sent to the
  // server, so we point to /auth/confirm — a client-side page that reads
  // the hash and calls setSession() to establish the session.
  //
  // IMPORTANT: NEXT_PUBLIC_SITE_URL must match your current environment in
  // .env.local (e.g. http://localhost:3000 for dev).
  // The redirectTo URL must be registered in Supabase Dashboard →
  // Authentication → URL Configuration → Redirect URLs.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    "https://kombat-id.vercel.app";

  const callbackUrl = `${siteUrl}/auth/confirm`;

  console.log(
    "[resolveStudentAuthAccount] inviting with redirectTo:",
    callbackUrl,
  );

  const { data: inviteData, error: inviteError } =
    await adminSupabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: callbackUrl,
      data: {
        role: "alumno",
        must_change_password: true,
      },
    });

  if (inviteError || !inviteData?.user) {
    console.error(
      "[resolveStudentAuthAccount] Failed to invite auth user:",
      inviteError?.message,
    );
    // Non-fatal: practitioner profile is still created
    return { authUserId: undefined };
  }

  // Ensure app_metadata role is set (inviteUserByEmail puts data in user_metadata)
  await adminSupabase.auth.admin.updateUserById(inviteData.user.id, {
    app_metadata: { role: "alumno" },
  });

  return { authUserId: inviteData.user.id };
}

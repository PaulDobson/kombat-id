import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "invite"
    | "recovery"
    | "email"
    | "signup"
    | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  // ── PKCE flow (signUp, resetPassword, OAuth) ──────────────────────────────
  // Supabase redirects with ?code=... when PKCE is enabled (default for SSR).
  if (code) {
    const { data: sessionData, error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData.user) {
      await linkPractitionerToUser(
        sessionData.user.id,
        sessionData.user.email ?? "",
      );
      return NextResponse.redirect(new URL(next, origin));
    }

    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  // ── Token hash flow (invite, magic link) ─────────────────────────────────
  // inviteUserByEmail does NOT support PKCE. Supabase verifies the token
  // server-side and redirects here with ?token_hash=...&type=invite.
  // We must call verifyOtp to exchange the hash for a session.
  if (tokenHash && type) {
    const { data: verifyData, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error && verifyData.user) {
      await linkPractitionerToUser(
        verifyData.user.id,
        verifyData.user.email ?? "",
      );

      // Invited students must set their own password on first login.
      // The must_change_password flag is set in user_metadata during invite.
      const mustChange =
        verifyData.user.user_metadata?.must_change_password === true;

      const redirectPath = mustChange ? "/change-password" : next;
      return NextResponse.redirect(new URL(redirectPath, origin));
    }

    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  // No recognizable auth params — send to login
  return NextResponse.redirect(new URL("/login", origin));
}

/**
 * Links an unlinked practitioner profile to a newly confirmed auth account.
 * Matches on contact_email (set by the instructor during registration).
 * Safe to call on every callback — only acts when a match exists.
 */
async function linkPractitionerToUser(
  authUserId: string,
  email: string,
): Promise<void> {
  if (!email) return;

  try {
    // Find a practitioner with this email that isn't linked yet
    const { data: practitioner } = await adminSupabase
      .from("practitioners")
      .select("id, auth_user_id")
      .ilike("contact_email", email)
      .is("auth_user_id", null)
      .maybeSingle();

    if (!practitioner) return;

    // Link the auth account to the practitioner profile
    await adminSupabase
      .from("practitioners")
      .update({
        auth_user_id: authUserId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", practitioner.id)
      .is("auth_user_id", null); // extra guard against race conditions
  } catch (err) {
    // Non-fatal — log and continue. The user still gets redirected.
    console.error("[auth/callback] Auto-link failed:", err);
  }
}

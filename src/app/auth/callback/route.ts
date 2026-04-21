import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data: sessionData, error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData.user) {
      // Auto-link: if a practitioner was pre-registered with this email
      // but has no auth_user_id yet, link it now.
      await linkPractitionerToUser(
        sessionData.user.id,
        sessionData.user.email ?? "",
      );

      return NextResponse.redirect(new URL(next, origin));
    }
  }

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

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";

export async function requireAdmin(): Promise<{ userId: string } | null> {
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

  if (!data) return null;
  return { userId: user.id };
}

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await adminSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data !== null;
}

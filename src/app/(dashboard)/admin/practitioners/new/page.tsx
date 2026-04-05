import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await adminSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) redirect("/");
  return user;
}

export default async function NewPractitionerPage() {
  await requireAdminUser();

  return (
    <main>
      <h1>Registrar nuevo practicante</h1>
      <Link href="/admin/practitioners">← Volver al listado</Link>
      <RegisterForm />
    </main>
  );
}

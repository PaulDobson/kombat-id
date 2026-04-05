import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import Link from "next/link";
import { IssueCertificationForm } from "./IssueCertificationForm";

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

export default async function NewCertificationPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const adminUser = await requireAdminUser();
  const { publicId } = await params;

  const repo = new DrizzlePractitionerRepository();
  const practitioner = await repo.findById(publicId);
  if (!practitioner) notFound();

  return (
    <main>
      <h1>Emitir certificación — {practitioner.fullName}</h1>
      <Link href={`/admin/practitioners/${publicId}`}>← Volver al detalle</Link>
      <IssueCertificationForm
        practitionerId={publicId}
        issuedBy={adminUser.id}
      />
    </main>
  );
}

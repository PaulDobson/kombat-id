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
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back link */}
      <Link
        href={`/admin/practitioners/${publicId}`}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        ← Volver al detalle
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-50">
          Emitir certificación
        </h1>
        <p className="text-sm text-neutral-400">
          Practicante:{" "}
          <span className="text-neutral-200 font-medium">
            {practitioner.fullName}
          </span>
        </p>
      </div>

      {/* Form card */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <IssueCertificationForm
          practitionerId={publicId}
          issuedBy={adminUser.id}
        />
      </div>
    </main>
  );
}

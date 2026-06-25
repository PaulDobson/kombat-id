import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guards";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import Link from "next/link";
import { UpdateGradeForm } from "./UpdateGradeForm";

export default async function UpdateGradePage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAdmin();
  const { publicId } = await params;

  const repo = new DrizzlePractitionerRepository();
  const practitioner = await repo.findById(publicId);
  if (!practitioner) notFound();

  return (
    <main>
      <h1>Actualizar grado — {practitioner.fullName}</h1>
      <Link href={`/admin/practitioners/${publicId}`}>← Volver al detalle</Link>
      <p>
        Grado actual:{" "}
        <strong>
          {practitioner.grade}
          {practitioner.dan ? ` ${practitioner.dan}° Dan` : ""}
        </strong>
      </p>
      <UpdateGradeForm
        publicId={publicId}
        adminId={user.id}
        currentGrade={practitioner.grade}
      />
    </main>
  );
}

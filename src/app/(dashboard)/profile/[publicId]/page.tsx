import { requireUser } from "@/lib/supabase/server";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { notFound } from "next/navigation";

export default async function PractitionerProfilePage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await requireUser(); // must be authenticated
  const { publicId } = await params;
  const repo = new DrizzlePractitionerRepository();
  const practitioner = await repo.findById(publicId);

  if (!practitioner) notFound();

  return (
    <main>
      <h1>{practitioner.fullName}</h1>
      <dl>
        <dt>Grado</dt>
        <dd>
          {practitioner.grade}
          {practitioner.dan ? ` ${practitioner.dan}° Dan` : ""}
        </dd>
        <dt>Estado</dt>
        <dd>{practitioner.isActive ? "Activo" : "Inactivo"}</dd>
        <dt>Inicio</dt>
        <dd>{practitioner.startDate}</dd>
      </dl>
    </main>
  );
}

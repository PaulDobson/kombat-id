import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { DrizzleCertificationRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleCertificationRepository";
import Link from "next/link";
import { DeactivateButton } from "./DeactivateButton";

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

export default async function AdminPractitionerDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const adminUser = await requireAdminUser();
  const { publicId } = await params;

  const practitionerRepo = new DrizzlePractitionerRepository();
  const certRepo = new DrizzleCertificationRepository();

  const [practitioner, certifications] = await Promise.all([
    practitionerRepo.findById(publicId),
    certRepo.findByPractitioner(publicId),
  ]);

  if (!practitioner) notFound();

  return (
    <main>
      <h1>{practitioner.fullName}</h1>
      <Link href="/admin/practitioners">← Volver al listado</Link>

      <section>
        <h2>Datos del practicante</h2>
        <dl>
          <dt>RUT</dt>
          <dd>{practitioner.rut}</dd>
          <dt>Fecha de nacimiento</dt>
          <dd>{practitioner.birthDate}</dd>
          <dt>Género</dt>
          <dd>{practitioner.gender}</dd>
          <dt>Grado</dt>
          <dd>
            {practitioner.grade}
            {practitioner.dan ? ` ${practitioner.dan}° Dan` : ""}
          </dd>
          <dt>Fecha de inicio</dt>
          <dd>{practitioner.startDate}</dd>
          <dt>Estado</dt>
          <dd>{practitioner.isActive ? "Activo" : "Inactivo"}</dd>
          {practitioner.weightKg && (
            <>
              <dt>Peso</dt>
              <dd>{practitioner.weightKg} kg</dd>
            </>
          )}
          {practitioner.contactEmail && (
            <>
              <dt>Email</dt>
              <dd>{practitioner.contactEmail}</dd>
            </>
          )}
          {practitioner.contactPhone && (
            <>
              <dt>Teléfono</dt>
              <dd>{practitioner.contactPhone}</dd>
            </>
          )}
          {!practitioner.isActive && practitioner.deactivatedAt && (
            <>
              <dt>Desactivado el</dt>
              <dd>{practitioner.deactivatedAt}</dd>
              <dt>Motivo</dt>
              <dd>{practitioner.deactivationReason}</dd>
            </>
          )}
        </dl>
      </section>

      <section>
        <h2>Acciones administrativas</h2>
        <nav>
          <Link href={`/admin/practitioners/${publicId}/grade`}>
            Actualizar grado
          </Link>
          {" | "}
          <Link href={`/admin/practitioners/${publicId}/certifications/new`}>
            Emitir certificación
          </Link>
          {practitioner.isActive && (
            <>
              {" | "}
              <DeactivateButton publicId={publicId} adminId={adminUser.id} />
            </>
          )}
        </nav>
      </section>

      <section>
        <h2>Certificaciones</h2>
        {certifications.length === 0 ? (
          <p>Sin certificaciones.</p>
        ) : (
          <ul>
            {certifications.map((cert) => (
              <li key={cert.id}>
                <strong>{cert.certType}</strong> — {cert.issuedAt}
                {cert.isRevoked && (
                  <span> [Revocada: {cert.revocationReason}]</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

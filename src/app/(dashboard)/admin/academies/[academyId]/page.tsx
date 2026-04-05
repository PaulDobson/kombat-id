import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { DrizzleAcademyRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleAcademyRepository";
import { DrizzleAcademyMembershipRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleAcademyMembershipRepository";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";
import Link from "next/link";
import { DeactivateAcademyButton } from "./DeactivateAcademyButton";

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

const REGION_LABELS: Record<ChileanRegion, string> = {
  arica_y_parinacota: "Arica y Parinacota",
  tarapaca: "Tarapacá",
  antofagasta: "Antofagasta",
  atacama: "Atacama",
  coquimbo: "Coquimbo",
  valparaiso: "Valparaíso",
  metropolitana: "Metropolitana",
  ohiggins: "O'Higgins",
  maule: "Maule",
  nuble: "Ñuble",
  biobio: "Biobío",
  araucania: "Araucanía",
  los_rios: "Los Ríos",
  los_lagos: "Los Lagos",
  aysen: "Aysén",
  magallanes: "Magallanes",
};

export default async function AcademyDetailPage({
  params,
}: {
  params: Promise<{ academyId: string }>;
}) {
  await requireAdminUser();
  const { academyId } = await params;

  const academyRepo = new DrizzleAcademyRepository();
  const membershipRepo = new DrizzleAcademyMembershipRepository();
  const practitionerRepo = new DrizzlePractitionerRepository();

  const [academy, memberships, activePractitionerCount] = await Promise.all([
    academyRepo.findById(academyId),
    membershipRepo.findByAcademy(academyId),
    academyRepo.countActivePractitioners(academyId),
  ]);

  if (!academy) notFound();

  // Fetch responsible instructors' names
  const instructors = await Promise.all(
    academy.responsibleInstructorIds.map((id) => practitionerRepo.findById(id)),
  );

  // Fetch active member details
  const activeMembers = await Promise.all(
    memberships
      .filter((m) => m.isActive)
      .map((m) => practitionerRepo.findById(m.practitionerId)),
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <Link
          href="/admin/academies"
          className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ← Volver al listado
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-2xl font-semibold text-neutral-50 tracking-tight">
            {academy.name}
          </h1>
          {academy.isActive ? (
            <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full text-xs">
              Activa
            </span>
          ) : (
            <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-xs">
              Inactiva
            </span>
          )}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <h2 className="text-base font-semibold text-neutral-50 mb-4">
          Datos de la academia
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Región
            </dt>
            <dd className="text-neutral-200">
              {REGION_LABELS[academy.region] ?? academy.region}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Ciudad
            </dt>
            <dd className="text-neutral-200">{academy.city}</dd>
          </div>
          {academy.address && (
            <div>
              <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                Dirección
              </dt>
              <dd className="text-neutral-200">{academy.address}</dd>
            </div>
          )}
          {academy.foundedDate && (
            <div>
              <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                Fundada
              </dt>
              <dd className="text-neutral-200">{academy.foundedDate}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
              Practicantes activos
            </dt>
            <dd className="text-neutral-200">{activePractitionerCount}</dd>
          </div>
          {!academy.isActive && academy.deactivatedAt && (
            <>
              <div>
                <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                  Desactivada el
                </dt>
                <dd className="text-neutral-200">{academy.deactivatedAt}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                  Motivo
                </dt>
                <dd className="text-neutral-200">
                  {academy.deactivationReason}
                </dd>
              </div>
            </>
          )}
        </dl>
      </div>

      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <h2 className="text-base font-semibold text-neutral-50 mb-4">
          Instructores responsables
        </h2>
        {instructors.length === 0 ? (
          <p className="text-neutral-500 text-sm">
            Sin instructores asignados.
          </p>
        ) : (
          <ul className="space-y-2">
            {instructors.map((instructor) =>
              instructor ? (
                <li
                  key={instructor.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="text-neutral-200">
                    {instructor.fullName}
                  </span>
                  <span className="text-neutral-500">—</span>
                  <span className="text-neutral-400 capitalize">
                    {instructor.role ?? "alumno"}
                  </span>
                  <Link
                    href={`/admin/practitioners/${instructor.id}`}
                    className="text-indigo-400 hover:text-indigo-300 text-xs ml-auto"
                  >
                    Ver perfil
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </div>

      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <h2 className="text-base font-semibold text-neutral-50 mb-4">
          Practicantes activos ({activePractitionerCount})
        </h2>
        {activeMembers.length === 0 ? (
          <p className="text-neutral-500 text-sm">Sin practicantes activos.</p>
        ) : (
          <ul className="space-y-2">
            {activeMembers.map((practitioner) =>
              practitioner ? (
                <li
                  key={practitioner.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="text-neutral-200">
                    {practitioner.fullName}
                  </span>
                  <span className="text-neutral-500">—</span>
                  <span className="text-neutral-400">
                    {practitioner.grade}
                    {practitioner.dan ? ` ${practitioner.dan}° Dan` : ""}
                  </span>
                  <Link
                    href={`/admin/practitioners/${practitioner.id}`}
                    className="text-indigo-400 hover:text-indigo-300 text-xs ml-auto"
                  >
                    Ver perfil
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </div>

      {academy.isActive && (
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6">
          <h2 className="text-base font-semibold text-neutral-50 mb-4">
            Acciones administrativas
          </h2>
          <DeactivateAcademyButton academyId={academyId} />
        </div>
      )}
    </main>
  );
}

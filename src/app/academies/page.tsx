import { DrizzleAcademyRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleAcademyRepository";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";

// Req 10.9 — Public page: no auth required

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

export default async function PublicAcademiesPage() {
  const academyRepo = new DrizzleAcademyRepository();
  const practitionerRepo = new DrizzlePractitionerRepository();

  const academies = await academyRepo.findAllActive();

  // Fetch instructor names for each academy (only public-safe fields)
  const academiesWithInstructors = await Promise.all(
    academies.map(async (academy) => {
      const instructors = await Promise.all(
        academy.responsibleInstructorIds.map((id) =>
          practitionerRepo.findById(id),
        ),
      );
      return {
        ...academy,
        instructors: instructors
          .filter(Boolean)
          .map((p) => ({ id: p!.id, fullName: p!.fullName, role: p!.role })),
      };
    }),
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-50 tracking-tight">
          Academias Kombat Taekwondo Chile
        </h1>
        <p className="text-neutral-400 mt-2 text-sm">
          Red oficial de academias activas en todo el país.
        </p>
      </div>

      {academiesWithInstructors.length === 0 ? (
        <p className="text-neutral-500 text-sm text-center py-12">
          No hay academias activas registradas.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {academiesWithInstructors.map((academy) => (
            <div
              key={academy.id}
              className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 space-y-3"
            >
              <div>
                <h2 className="text-base font-semibold text-neutral-50">
                  {academy.name}
                </h2>
                <p className="text-sm text-neutral-400 mt-0.5">
                  {REGION_LABELS[academy.region] ?? academy.region} —{" "}
                  {academy.city}
                </p>
              </div>

              {academy.instructors.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                    Instructores responsables
                  </p>
                  <ul className="space-y-1">
                    {academy.instructors.map((instructor) => (
                      <li
                        key={instructor.id}
                        className="text-sm text-neutral-300"
                      >
                        {instructor.fullName}
                        {instructor.role && (
                          <span className="text-neutral-500 ml-1 capitalize">
                            ({instructor.role})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {academy.foundedDate && (
                <p className="text-xs text-neutral-500">
                  Fundada: {academy.foundedDate}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

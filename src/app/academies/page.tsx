import { DrizzleAcademyRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzleAcademyRepository";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import { PublicNav } from "@/app/_components/PublicNav";
import type { ChileanRegion } from "@/modules/practitioner-identity/domain/entities/academy";

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

const ROLE_LABELS: Record<string, string> = {
  instructor: "Instructor",
  profesor: "Profesor",
  maestro: "Maestro",
};

export default async function PublicAcademiesPage() {
  const academyRepo = new DrizzleAcademyRepository();
  const practitionerRepo = new DrizzlePractitionerRepository();

  const academies = await academyRepo.findAllActive();

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

  // Group by region for display
  const byRegion = new Map<string, typeof academiesWithInstructors>();
  for (const academy of academiesWithInstructors) {
    const region = REGION_LABELS[academy.region] ?? academy.region;
    if (!byRegion.has(region)) byRegion.set(region, []);
    byRegion.get(region)!.push(academy);
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <PublicNav />

      <main className="pt-16">
        {/* Header */}
        <div className="relative border-b border-neutral-800 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[200px] bg-primary-600/8 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-7xl mx-auto px-6 py-16 sm:py-20 space-y-3">
            <div className="inline-flex items-center gap-2 bg-primary-900/40 border border-primary-800/60 text-primary-400 text-xs font-medium px-3 py-1.5 rounded-full">
              <span aria-hidden="true">🏫</span>
              Red oficial
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Academias Kombat Taekwondo
            </h1>
            <p className="text-neutral-400 text-sm max-w-lg">
              Red oficial de academias activas en todo Chile. Encuentra la más
              cercana a ti y conoce a sus instructores responsables.
            </p>
            <p className="text-xs text-neutral-600 pt-1">
              {academiesWithInstructors.length} academia
              {academiesWithInstructors.length !== 1 ? "s" : ""} activa
              {academiesWithInstructors.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-16">
          {academiesWithInstructors.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-neutral-500 text-sm">
                No hay academias activas registradas.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {Array.from(byRegion.entries()).map(([region, list]) => (
                <section key={region}>
                  <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-5 flex items-center gap-3">
                    <span>{region}</span>
                    <span className="h-px flex-1 bg-neutral-800" />
                    <span className="text-neutral-600 normal-case tracking-normal font-normal">
                      {list.length} academia{list.length !== 1 ? "s" : ""}
                    </span>
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {list.map((academy) => (
                      <div
                        key={academy.id}
                        className="group bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-6 space-y-4 transition-colors"
                      >
                        {/* Name + city */}
                        <div>
                          <h3 className="text-base font-semibold text-neutral-50 leading-snug">
                            {academy.name}
                          </h3>
                          <p className="text-sm text-neutral-400 mt-0.5">
                            {academy.city}
                          </p>
                          {academy.address && (
                            <p className="text-xs text-neutral-600 mt-0.5">
                              {academy.address}
                            </p>
                          )}
                        </div>

                        {/* Instructors */}
                        {academy.instructors.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                              Instructores
                            </p>
                            <ul className="space-y-1">
                              {academy.instructors.map((instructor) => (
                                <li
                                  key={instructor.id}
                                  className="flex items-center gap-2 text-sm text-neutral-300"
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0"
                                    aria-hidden="true"
                                  />
                                  {instructor.fullName}
                                  {instructor.role && (
                                    <span className="text-xs text-neutral-600 capitalize">
                                      {ROLE_LABELS[instructor.role] ??
                                        instructor.role}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Founded */}
                        {academy.foundedDate && (
                          <p className="text-xs text-neutral-600 border-t border-neutral-800 pt-3">
                            Fundada en {academy.foundedDate.slice(0, 4)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 px-6 py-8 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded bg-primary-600 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-white font-bold text-[9px]">KT</span>
            </div>
            <span>Kombat Taekwondo Chile</span>
          </div>
          <p>Red oficial de academias · {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

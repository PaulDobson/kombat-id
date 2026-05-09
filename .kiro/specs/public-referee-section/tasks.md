# Plan de Implementación: Sección Pública de Árbitros (`public-referee-section`)

## Descripción general

Modificación de un único archivo (`src/app/page.tsx`) para agregar la sección pública de árbitros aprobados a la landing page. Se reutilizan íntegramente los componentes y la lógica existentes del bounded context `referee-registration`. No se crea ni modifica ningún otro archivo.

## Tareas

- [x] 1. Modificar `src/app/page.tsx` para integrar la sección de árbitros
  - [x] 1.1 Agregar imports y la función `getApprovedReferees`
    - Agregar los imports necesarios al inicio del archivo:
      - `RefereeListItem` y `toRefereeListItem` desde `@/modules/referee-registration/presentation/components/refereeListItem`
      - `RefereeGrid` desde `@/modules/referee-registration/presentation/components/RefereeGrid`
      - `listRefereeRegistrations` desde `@/modules/referee-registration/application/use-cases/listRefereeRegistrations`
      - `SupabaseRefereeRegistrationRepository` desde `@/modules/referee-registration/infrastructure/repositories/supabaseRefereeRegistrationRepository`
    - Declarar la función `getApprovedReferees` junto a `getUpcomingEvents`, siguiendo el mismo patrón:
      ```typescript
      async function getApprovedReferees(): Promise<RefereeListItem[]> {
        const repo = new SupabaseRefereeRegistrationRepository();
        const { items } = await listRefereeRegistrations(
          { status: "approved", pageSize: 200 },
          { repo },
        );
        return items.map(toRefereeListItem);
      }
      ```
    - _Requisitos: 2.1, 2.2, 2.3, 7.2, 8.4_

  - [x] 1.2 Actualizar la firma de `LandingPage` y el fetch de datos
    - Agregar el prop `searchParams: Promise<{ search?: string }>` a la función de página
    - Cambiar el fetch de datos a `Promise.all` para ejecutar ambas consultas en paralelo:
      ```typescript
      const [upcoming, approvedReferees] = await Promise.all([
        getUpcomingEvents(),
        getApprovedReferees(),
      ]);
      const { search } = await searchParams;
      const searchQuery = search?.trim() || undefined;
      ```
    - _Requisitos: 1.4, 7.1, 7.3, 7.4, 8.1_

  - [x] 1.3 Insertar el bloque JSX `PublicRefereesSection`
    - Insertar la sección después del bloque `{/* ── PRÓXIMOS EVENTOS */}` y antes del bloque `{/* ── CTA FINAL */}`:
      ```tsx
      {
        /* ── ÁRBITROS OFICIALES ───────────────────────────────────────────── */
      }
      <section className="border-t border-neutral-800 bg-neutral-900/20">
        <div className="max-w-7xl mx-auto px-6 py-20 sm:py-24">
          <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 bg-neutral-800 border border-neutral-700 text-neutral-400 text-xs font-medium px-3 py-1.5 rounded-full">
                Directorio
              </span>
              <h2 className="text-3xl font-bold tracking-tight">
                Árbitros Oficiales
              </h2>
              <p className="text-sm text-neutral-400">
                Árbitros certificados de Kombat Taekwondo Chile
              </p>
            </div>
            <span className="text-sm text-neutral-500 shrink-0">
              {approvedReferees.length}{" "}
              {approvedReferees.length === 1 ? "árbitro" : "árbitros"}
            </span>
          </div>
          <form method="GET" className="mb-8">
            <div className="relative max-w-sm">
              <span
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm"
              >
                🔍
              </span>
              <input
                type="search"
                name="search"
                defaultValue={searchQuery ?? ""}
                placeholder="Buscar por nombre..."
                className="w-full rounded-xl border border-neutral-700 bg-neutral-800/60 pl-9 pr-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              />
            </div>
          </form>
          <RefereeGrid referees={approvedReferees} searchQuery={searchQuery} />
        </div>
      </section>;
      ```
    - _Requisitos: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 6.1, 6.2, 6.4_

  - [ ]\* 1.4 Escribir property test para `getApprovedReferees` — solo árbitros aprobados
    - **Propiedad 2: Solo árbitros aprobados en el resultado**
    - Usar `fast-check` para generar arrays de `RefereeRegistration` con estados mixtos (`pending`, `approved`, `rejected`)
    - Verificar que al filtrar por `status === "approved"` y mapear con `toRefereeListItem`, el resultado no contiene ningún registro con `status !== "approved"`
    - Verificar que la longitud del resultado es igual al número de registros con `status === "approved"` en el input
    - **Valida: Requisitos 2.1, 2.2, 2.3**

- [x] 2. Checkpoint — Verificar que la implementación compila y los tests pasan
  - Ejecutar `pnpm tsc --noEmit` para verificar que no hay errores de tipos en `src/app/page.tsx`
  - Ejecutar los tests con `pnpm test --run` para confirmar que todos los tests pasan
  - Verificar que la página no contiene la directiva `"use client"`
  - Verificar que `Promise.all` está presente en el cuerpo de `LandingPage`
  - Asegurarse de que todos los tests pasan; consultar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- El único archivo modificado es `src/app/page.tsx` — ningún componente existente se toca
- Los imports deben seguir el orden establecido en el archivo: primero `next/link`, luego `@/lib/...`, luego `@/app/...`, luego los nuevos imports de `@/modules/...`
- La función `getApprovedReferees` debe declararse junto a `getUpcomingEvents`, antes de las constantes `EVENT_TYPE_LABELS` y `EVENT_TYPE_STYLES`
- El bloque JSX de la sección se inserta como comentario hermano de las demás secciones, respetando el patrón de comentarios `{/* ── NOMBRE ── */}` existente

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4"] }
  ]
}
```

# Plan de Implementación: Listado Público de Árbitros (`referee-list`)

## Descripción general

Implementar la página `/admin/referees` que muestra todos los árbitros con estado `approved` en tarjetas visuales. El feature reutiliza íntegramente el bounded context `src/modules/referee-registration/` existente y agrega tres archivos nuevos: la página Server Component, el grid de tarjetas y la tarjeta individual. También actualiza la navegación del panel admin.

---

## Tareas

- [x] 1. Definir el DTO `RefereeListItem` y la función de serialización
  - [x] 1.1 Crear el tipo `RefereeListItem` y la función `toRefereeListItem` en el módulo de presentación
    - Crear `src/modules/referee-registration/presentation/components/refereeListItem.ts`
    - Definir la interfaz `RefereeListItem` con los campos `id`, `fullName`, `country`, `registrationNumber`, `approvedAt`
    - Implementar `toRefereeListItem(registration: RefereeRegistration): RefereeListItem` que mapea la entidad al DTO excluyendo estructuralmente `email`, `authUserId`, `certificatePath`, `approvedBy`, `rejectedAt`, `rejectedBy`
    - _Requisitos: 2.2, 2.3_

  - [x]\* 1.2 Escribir property test para la serialización segura del DTO
    - **Propiedad 2: Serialización segura del DTO**
    - Usar `fast-check` para generar `RefereeRegistration` arbitrarias con `status === "approved"` y verificar que `toRefereeListItem` nunca incluye los campos sensibles
    - Verificar que el resultado contiene exactamente `id`, `fullName`, `country`, `registrationNumber`, `approvedAt`
    - Crear `src/modules/referee-registration/presentation/components/refereeListItem.test.ts`
    - **Valida: Requisitos 2.2, 2.3**

- [x] 2. Implementar el componente `RefereeCard`
  - [x] 2.1 Crear `RefereeCard.tsx` como Server Component
    - Crear `src/modules/referee-registration/presentation/components/RefereeCard.tsx`
    - Recibir `referee: RefereeListItem` como prop
    - Renderizar avatar circular con iniciales (primera letra del primer nombre + primera letra del primer apellido), fondo gradiente `from-primary-600 to-primary-800`
    - Renderizar nombre completo con clases `font-semibold text-lg text-neutral-50`
    - Renderizar país con ícono de globo (🌎)
    - Renderizar número de registro con clase `font-mono`
    - Invocar `formatDateLong(approvedAt)` cuando `approvedAt` es un string válido; mostrar `"Afiliado el —"` cuando es `null` o `undefined`
    - Renderizar badge `"Árbitro Oficial"` con clases `bg-primary-900/50 text-primary-400 border border-primary-800`
    - Aplicar clases base `bg-neutral-900 border border-neutral-800` y hover `hover:border-primary-500/50 hover:bg-neutral-800/60`
    - Sin directiva `"use client"`, sin hooks de React
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 8.3_

  - [x]\* 2.2 Escribir property test para el formato de fecha en `RefereeCard`
    - **Propiedad 6: Formato de fecha de afiliación**
    - Usar `fast-check` para generar ISO timestamps válidos y verificar que `formatDateLong` retorna un string no vacío con el patrón `"D de [mes] de YYYY"` donde `[mes]` es uno de los 12 meses en español
    - Verificar que `formatDateLong` con `null`/`undefined`/`""` retorna `"—"` sin lanzar excepción (cubrir el guard en `RefereeCard`)
    - Crear `src/modules/referee-registration/presentation/components/RefereeCard.test.ts`
    - **Valida: Requisitos 5.4, 5.5, 6.1, 6.2**

- [x] 3. Implementar el componente `RefereeGrid`
  - [x] 3.1 Crear `RefereeGrid.tsx` como Server Component
    - Crear `src/modules/referee-registration/presentation/components/RefereeGrid.tsx`
    - Recibir `referees: RefereeListItem[]` y `searchQuery?: string` como props
    - Cuando `searchQuery` es no vacío, filtrar `referees` por `fullName` con comparación case-insensitive
    - Cuando el array filtrado es no vacío, renderizar el grid responsivo: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
    - Renderizar exactamente una `<RefereeCard>` por cada elemento del array filtrado
    - Cuando el array filtrado está vacío, renderizar estado vacío con mensaje `"No hay árbitros registrados"` y descripción `"Aún no se han aprobado registros de árbitros."`
    - Sin directiva `"use client"`, sin hooks de React
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.2_

  - [x]\* 3.2 Escribir property tests para `RefereeGrid`
    - **Propiedad 4: Correspondencia 1:1 entre array y tarjetas renderizadas**
    - Usar `fast-check` para generar arrays de `RefereeListItem[]` de longitud N y verificar que el grid renderiza exactamente N tarjetas cuando no hay filtro
    - **Propiedad 5: Filtrado de búsqueda es subconjunto correcto**
    - Usar `fast-check` para generar un array de árbitros y un query de búsqueda; verificar que todos los elementos mostrados contienen el query (case-insensitive) y ningún elemento que no lo contiene aparece en el resultado
    - Crear `src/modules/referee-registration/presentation/components/RefereeGrid.test.ts`
    - **Valida: Requisitos 4.1, 4.4**

- [x] 4. Checkpoint — Verificar componentes de presentación
  - Asegurarse de que todos los tests pasan, consultar al usuario si surgen dudas.

- [x] 5. Implementar la página `/admin/referees`
  - [x] 5.1 Crear `page.tsx` como Server Component async
    - Crear `src/app/(dashboard)/admin/referees/page.tsx`
    - Declarar como `export default async function` sin directiva `"use client"` ni hooks de React
    - Invocar `requireAdminUser()` como primera operación (redirige a `/login` si no autenticado, a `/dashboard` si no admin)
    - Instanciar `SupabaseRefereeRegistrationRepository` (composition root)
    - Llamar a `listRefereeRegistrations({ status: "approved", pageSize: 200 }, { repo })` para obtener los árbitros aprobados
    - Serializar cada `RefereeRegistration` a `RefereeListItem` usando `toRefereeListItem`
    - Leer `searchParams` para obtener el query param `search`
    - Renderizar encabezado con título `"Árbitros Oficiales"`, descripción `"Registro oficial de árbitros de Kombat Taekwondo Chile"` y contador igual al `total` retornado por el caso de uso
    - Renderizar campo de búsqueda que actualiza el query param `?search=`
    - Pasar `referees` y `searchQuery` a `<RefereeGrid>`
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 8.1_

  - [x]\* 5.2 Escribir property test para el filtrado de árbitros aprobados en la página
    - **Propiedad 1: Solo árbitros aprobados en el listado**
    - Usar `fast-check` para generar conjuntos de `RefereeRegistration` con estados mixtos (`pending`, `approved`, `rejected`) y verificar que `toRefereeListItem` solo se aplica a los que tienen `status === "approved"`
    - **Propiedad 3: Invariante de conteo**
    - Verificar que el valor del contador del encabezado es igual al número de `RefereeListItem` en el array pasado a `RefereeGrid`
    - Crear `src/app/(dashboard)/admin/referees/page.test.ts`
    - **Valida: Requisitos 2.1, 2.2, 3.2**

- [x] 6. Actualizar la navegación del panel admin
  - [x] 6.1 Modificar `DashboardNav.tsx` para reemplazar el enlace de árbitros
    - Editar `src/app/(dashboard)/_components/DashboardNav.tsx`
    - Reemplazar el `<NavLink href="/admin/referee-registrations">Árbitros</NavLink>` existente por `<NavLink href="/admin/referees">Lista de árbitros</NavLink>`
    - Mantener el resto de la navegación admin sin cambios
    - _Requisitos: 7.1, 7.2_

- [x] 7. Checkpoint final — Verificar integración completa
  - Asegurarse de que todos los tests pasan y que `pnpm type-check` no reporta errores. Consultar al usuario si surgen dudas.

---

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Cada tarea referencia requisitos específicos para trazabilidad.
- El diseño usa TypeScript con Next.js App Router y `fast-check` para property tests (ya instalado como devDependency).
- `vitest` es el test runner del proyecto (ya instalado). Ejecutar con `pnpm vitest --run`.
- Todos los componentes nuevos son Server Components — sin `"use client"`, sin hooks de React.
- `SupabaseRefereeRegistrationRepository` ya contiene `import "server-only"` — no requiere modificación (Requisito 8.4).
- La función `formatDateLong` ya existe en `src/lib/format-date.ts` y maneja el formato requerido. El guard para `null`/`undefined` debe implementarse en `RefereeCard` antes de invocarla.
- El campo de búsqueda en la página puede ser un `<form method="GET">` nativo para mantener la arquitectura Server Component sin necesidad de `"use client"`.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "5.1"] },
    { "id": 4, "tasks": ["5.2", "6.1"] }
  ]
}
```

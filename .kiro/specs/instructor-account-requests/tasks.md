# Plan de Implementación: Instructor Account Requests

## Descripción general

Implementar el módulo `instructor-account-requests` siguiendo Clean Architecture + Screaming Architecture bajo `src/modules/instructor-account-requests/`. El módulo espeja el patrón de `referee-registration` e incluye: entidad de dominio, repositorio Supabase, seis casos de uso, Server Actions, formulario público en `/instructor-registration` y panel de administración en `/admin/instructor-requests`.

---

## Tareas

- [x] 1. Estructura de dominio — entidad, errores e interfaz de repositorio
  - [x] 1.1 Crear la entidad `InstructorAccountRequest` y la función `isValidStatusTransition`
    - Crear `src/modules/instructor-account-requests/domain/entities/instructorAccountRequest.ts`
    - Definir `InstructorAccountRequestStatus = "pending" | "approved" | "rejected" | "observed"`
    - Definir la interfaz `InstructorAccountRequest` con todos los campos del diseño
    - Implementar `isValidStatusTransition(current, next): boolean` — retorna `true` solo para `pending → approved`, `pending → rejected`, `pending → observed`; función pura sin efectos secundarios
    - _Requisitos: 7.1, 7.2, 7.3_

  - [ ]\* 1.2 Escribir property test para `isValidStatusTransition`
    - **Propiedad 7: Transiciones de estado — función pura y exhaustiva**
    - Usar `fast-check` para generar todos los pares `(estadoActual, estadoDestino)` de `InstructorAccountRequestStatus` y verificar que `isValidStatusTransition` retorna `true` únicamente para `(pending, approved)`, `(pending, rejected)` y `(pending, observed)`
    - Verificar pureza: llamar la función dos veces con los mismos argumentos produce siempre el mismo resultado
    - Crear `src/modules/instructor-account-requests/domain/entities/instructorAccountRequest.test.ts`
    - **Valida: Requisitos 7.1, 7.2, 7.3**

  - [x] 1.3 Crear los errores de dominio
    - Crear `src/modules/instructor-account-requests/domain/errors/index.ts`
    - Definir clases que extienden `DomainError` de `@/lib/errors`: `InstructorAccountRequestNotFoundError`, `DuplicateInstructorEmailError`, `InvalidInstructorStatusTransitionError`, `InstructorAuthUserCreationError`
    - _Requisitos: 4.3, 4.5, 4.8, 5.3, 5.5, 6.5_

  - [x] 1.4 Crear la interfaz del repositorio y el DTO de lista
    - Crear `src/modules/instructor-account-requests/domain/interfaces/instructorAccountRequestRepository.ts`
    - Definir `InstructorAccountRequestFilter` con campos `status?` y paginación `page?`, `pageSize?`
    - Definir `InstructorAccountRequestRepository` con métodos: `findById`, `findByEmail`, `list`, `save`, `updateStatus`, `updateObservation`
    - Crear `src/modules/instructor-account-requests/presentation/components/instructorAccountRequestListItem.ts`
    - Definir `InstructorAccountRequestListItem` con los campos serializables para la vista admin (excluir `authUserId`, `approvedBy`, `rejectedBy`, `observedBy`)
    - _Requisitos: 3.3, 8.1, 8.2, 10.6_

- [x] 2. Casos de uso de la capa de aplicación
  - [x] 2.1 Implementar `submitInstructorAccountRequest`
    - Crear `src/modules/instructor-account-requests/application/use-cases/submitInstructorAccountRequest.ts`
    - Definir schema Zod `SubmitInstructorAccountRequestInput` con validaciones de todos los campos (email, fullName, phone, academyName, message)
    - Verificar unicidad de email con `repo.findByEmail` antes de persistir
    - Crear la entidad con `status: "pending"` y `id` generado con `randomUUID()`
    - Lanzar `DuplicateInstructorEmailError` si el email ya existe
    - Retornar `{ id: string }`
    - _Requisitos: 1.2, 1.5, 1.11, 2.1, 2.2_

  - [ ]\* 2.2 Escribir property tests para `submitInstructorAccountRequest`
    - **Propiedad 1: Creación de solicitud produce entidad con estado pending**
    - Usar `fast-check` para generar combinaciones válidas de `(email, fullName, phone?, academyName?, message?)` y verificar que el use case crea una entidad con `status === "pending"` y retorna un UUID no vacío
    - **Propiedad 2: Inputs inválidos son rechazados por el validador**
    - Usar `fast-check` para generar inputs donde al menos un campo viola sus restricciones y verificar que el schema Zod rechaza la solicitud sin crear ninguna entidad
    - **Propiedad 3: Unicidad de email — duplicados producen CONFLICT**
    - Usar un repositorio en memoria (mock) para simular email existente y verificar que el use case lanza `DuplicateInstructorEmailError`
    - Crear `src/modules/instructor-account-requests/application/use-cases/submitInstructorAccountRequest.test.ts`
    - **Valida: Requisitos 1.2, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 2.1, 2.2**

  - [x] 2.3 Implementar `approveInstructorAccountRequest`
    - Crear `src/modules/instructor-account-requests/application/use-cases/approveInstructorAccountRequest.ts`
    - Definir la interfaz `InstructorAuthService` con método `inviteInstructorUser(email): Promise<{ authUserId: string }>`
    - Definir schema Zod de input con `requestId` y `adminId` (ambos UUID)
    - Recuperar la solicitud con `repo.findById`; lanzar `InstructorAccountRequestNotFoundError` si no existe
    - Verificar `isValidStatusTransition(status, "approved")`; lanzar `InvalidInstructorStatusTransitionError` si falla
    - Llamar `authService.inviteInstructorUser` ANTES de actualizar el estado; si falla, lanzar `InstructorAuthUserCreationError` sin modificar la BD
    - Llamar `repo.updateStatus` con `status: "approved"`, `authUserId`, `adminId` y timestamp ISO
    - _Requisitos: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]\* 2.4 Escribir property tests para `approveInstructorAccountRequest`
    - **Propiedad 8: Consistencia de aprobación — authUserId no-nulo si éxito**
    - Usar `fast-check` para generar solicitudes en estado `pending` y respuestas exitosas del Auth_Service; verificar que la solicitud actualizada tiene `status === "approved"`, `authUserId` no-nulo, `approvedBy` igual al UUID del admin y `approvedAt` con timestamp ISO válido
    - **Propiedad 9: Invariante de fallo Auth — estado permanece pending**
    - Usar `fast-check` para generar solicitudes en estado `pending` y simular fallo del Auth_Service; verificar que el use case lanza `InstructorAuthUserCreationError` y la solicitud no es modificada en el repositorio
    - Crear `src/modules/instructor-account-requests/application/use-cases/approveInstructorAccountRequest.test.ts`
    - **Valida: Requisitos 4.7, 4.8**

  - [x] 2.5 Implementar `rejectInstructorAccountRequest` y `observeInstructorAccountRequest`
    - Crear `src/modules/instructor-account-requests/application/use-cases/rejectInstructorAccountRequest.ts`
    - Recuperar solicitud, verificar transición `pending → rejected`, llamar `repo.updateStatus` con `rejectedBy` y `rejectedAt`
    - Crear `src/modules/instructor-account-requests/application/use-cases/observeInstructorAccountRequest.ts`
    - Recuperar solicitud, verificar que existe, llamar `repo.updateObservation` con `observationNotes`, `observedBy` y `observedAt`; el repositorio actualiza el estado a `observed`
    - _Requisitos: 5.2, 5.3, 5.4, 5.5, 5.6, 6.4, 6.5, 6.6_

  - [ ]\* 2.6 Escribir property test para `observeInstructorAccountRequest`
    - **Propiedad 10: Consistencia de observación — estado y notas correctas**
    - Usar `fast-check` para generar solicitudes existentes y strings no vacíos de `observationNotes`; verificar que la solicitud actualizada tiene `status === "observed"`, `observationNotes` igual al string proporcionado, `observedBy` igual al UUID del admin y `observedAt` con timestamp ISO válido
    - Crear `src/modules/instructor-account-requests/application/use-cases/observeInstructorAccountRequest.test.ts`
    - **Valida: Requisito 6.6**

  - [x] 2.7 Implementar `listInstructorAccountRequests` y `getInstructorAccountRequestById`
    - Crear `src/modules/instructor-account-requests/application/use-cases/listInstructorAccountRequests.ts`
    - Aceptar `InstructorAccountRequestFilter`; delegar a `repo.list`; retornar `{ items, total }`
    - Crear `src/modules/instructor-account-requests/application/use-cases/getInstructorAccountRequestById.ts`
    - Recuperar por id; lanzar `InstructorAccountRequestNotFoundError` si no existe
    - _Requisitos: 3.2, 3.6_

  - [ ]\* 2.8 Escribir property tests para `listInstructorAccountRequests`
    - **Propiedad 4: Paginación nunca excede el límite configurado**
    - Usar `fast-check` para generar N solicitudes y números de página válidos; verificar que el use case retorna como máximo 25 items por página y que `total` refleja el número real de registros
    - **Propiedad 5: Filtrado por estado retorna solo items del estado solicitado**
    - Usar `fast-check` para generar conjuntos de solicitudes con estados mixtos y un filtro de estado; verificar que todos los items retornados tienen exactamente ese estado
    - Crear `src/modules/instructor-account-requests/application/use-cases/listInstructorAccountRequests.test.ts`
    - **Valida: Requisitos 3.2, 3.6**

- [x] 3. Checkpoint — Verificar capa de dominio y aplicación
  - Asegurarse de que todos los tests pasan con `pnpm vitest --run` y que `pnpm type-check` no reporta errores. Consultar al usuario si surgen dudas.

- [x] 4. Infraestructura — repositorio Supabase y servicio Auth
  - [x] 4.1 Implementar `SupabaseInstructorAccountRequestRepository`
    - Crear `src/modules/instructor-account-requests/infrastructure/repositories/supabaseInstructorAccountRequestRepository.ts`
    - Agregar `import "server-only"` al inicio del archivo
    - Definir `InstructorAccountRequestRowSchema` con Zod para validación en runtime
    - Implementar todos los métodos de `InstructorAccountRequestRepository`: `findById`, `findByEmail`, `list` (con paginación y filtro por status), `save` (upsert por id), `updateStatus` (maneja `approved`, `rejected`), `updateObservation` (actualiza `observation_notes`, `observed_by`, `observed_at`, `status = "observed"`)
    - Implementar métodos privados `toEntity(row)` y `toRow(entity)` con mapeo explícito de snake_case a camelCase
    - Usar `adminSupabase` de `@/lib/supabase/admin` para todas las consultas
    - _Requisitos: 8.1, 8.2, 8.4, 10.4, 10.5_

  - [ ]\* 4.2 Escribir property test para el round-trip de serialización
    - **Propiedad 11: Round-trip de serialización de entidad**
    - Usar `fast-check` para generar `InstructorAccountRequest` válidas con cualquier combinación de campos opcionales presentes o nulos; verificar que `toEntity(toRow(entity))` produce una entidad con todos los campos equivalentes a la original
    - Crear `src/modules/instructor-account-requests/infrastructure/repositories/supabaseInstructorAccountRequestRepository.test.ts`
    - **Valida: Requisitos 8.1, 8.2, 8.3**

- [x] 5. Presentación — Server Actions
  - [x] 5.1 Implementar las Server Actions del módulo
    - Crear `src/modules/instructor-account-requests/presentation/actions/instructorAccountRequestActions.ts`
    - Agregar `"use server"` al inicio del archivo
    - Definir `type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string; code: string }`
    - Implementar `requireAdmin()` helper privado: verifica sesión con `createClient()` y consulta `admin_users` con `adminSupabase`
    - Implementar `submitInstructorAccountRequestAction(rawInput)`: no requiere autenticación; valida con Zod; llama al use case; retorna `{ success: true, data: { id } }` o error estructurado
    - Implementar `approveInstructorAccountRequestAction(rawInput)`: llama `requireAdmin()` primero; instancia `SupabaseInstructorAccountRequestRepository` y el `InstructorAuthService` (crea usuario con `adminSupabase.auth.admin.createUser` con `app_metadata: { role: "instructor" }`); llama al use case; llama `revalidatePath("/admin/instructor-requests")`
    - Implementar `rejectInstructorAccountRequestAction(rawInput)`: llama `requireAdmin()` primero; llama al use case; llama `revalidatePath`
    - Implementar `observeInstructorAccountRequestAction(rawInput)`: llama `requireAdmin()` primero; llama al use case; llama `revalidatePath`
    - Implementar `listInstructorAccountRequestsAction(rawInput)`: llama `requireAdmin()` primero; llama al use case; mapea items a `InstructorAccountRequestListItem` (excluye campos sensibles)
    - Capturar errores de dominio conocidos y mapearlos a `ActionResult` con código y mensaje en español; capturar errores inesperados con `console.error` y retornar `code: "INTERNAL_ERROR"`
    - _Requisitos: 4.1, 4.9, 5.1, 5.8, 6.3, 6.7, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.6_

  - [ ]\* 5.2 Escribir property tests para las Server Actions
    - **Propiedad 12: Action_Result siempre tipado — nunca undefined**
    - Usar `fast-check` para generar inputs válidos, inválidos y con errores de dominio simulados; verificar que cada Server Action retorna siempre un objeto con la forma `{ success: true; data: T } | { success: false; error: string; code: string }`, nunca `undefined`, nunca `null`, y que `error` es un string no vacío y `code` es uno de los códigos definidos
    - **Propiedad 13: Autorización — FORBIDDEN sin sesión o rol admin válido**
    - Simular llamadas sin sesión activa o con rol no-admin; verificar que las Admin_Actions retornan `{ success: false, code: "FORBIDDEN" }` sin ejecutar ninguna operación de lectura ni escritura
    - Crear `src/modules/instructor-account-requests/presentation/actions/instructorAccountRequestActions.test.ts`
    - **Valida: Requisitos 4.1, 9.1, 9.2, 9.4, 10.1, 10.2, 10.3**

- [x] 6. Checkpoint — Verificar capa de infraestructura y acciones
  - Asegurarse de que todos los tests pasan con `pnpm vitest --run` y que `pnpm type-check` no reporta errores. Consultar al usuario si surgen dudas.

- [x] 7. Presentación — Componentes del formulario público
  - [x] 7.1 Crear `InstructorRequestForm` (Client Component)
    - Crear `src/modules/instructor-account-requests/presentation/components/InstructorRequestForm.tsx`
    - Agregar `"use client"` al inicio del archivo
    - Usar `useState`, `useTransition` para manejar estado del formulario y estado de envío
    - Definir schema Zod client-side con las mismas reglas que el use case (email, fullName, phone, academyName, message)
    - Campos del formulario: email (required), fullName (required), phone (opcional), academyName (opcional), message (opcional, textarea)
    - Validar con Zod antes de llamar al Server Action; mostrar errores de campo inline
    - Al recibir `success: true`, mostrar mensaje de confirmación inline y limpiar el formulario
    - Al recibir `code: "CONFLICT"`, mostrar el error en el campo email sin limpiar los demás campos
    - Para otros errores, mostrar mensaje de error global con `role="alert"`
    - _Requisitos: 1.1, 1.3, 1.4, 1.13, 2.3_

  - [x] 7.2 Crear la página pública `/instructor-registration`
    - Crear `src/app/instructor-registration/page.tsx` como Server Component (sin `"use client"`)
    - Renderizar encabezado con título y descripción del formulario
    - Renderizar `<InstructorRequestForm />` importado desde el módulo
    - Sin llamadas a `requireUser` ni verificación de sesión
    - _Requisitos: 1.1_

  - [x] 7.3 Agregar `/instructor-registration` a `PUBLIC_ROUTES` en middleware
    - Editar `src/middleware.ts`
    - Agregar `"/instructor-registration"` al array `PUBLIC_ROUTES`
    - _Requisito: 11.1_

- [x] 8. Presentación — Componentes del panel de administración
  - [x] 8.1 Crear `InstructorRequestsTable` (Server Component)
    - Crear `src/modules/instructor-account-requests/presentation/components/InstructorRequestsTable.tsx`
    - Sin `"use client"` — es un Server Component
    - Recibir `requests: InstructorAccountRequestListItem[]`, `totalCount`, `page`, `totalPages` como props
    - Renderizar tabla con columnas: email, nombre completo, teléfono, academia, mensaje (truncado), badge de estado, fecha de creación
    - Implementar badge de estado con colores: `pending` → amber, `approved` → emerald, `rejected` → red, `observed` → blue
    - Para cada fila con `status === "pending"`, renderizar `<ApproveInstructorRequestButton>`, `<RejectInstructorRequestButton>` y `<ObserveInstructorRequestButton>`; para otros estados, no renderizar ningún botón de acción
    - Renderizar paginación si `totalPages > 1`
    - _Requisitos: 3.3, 3.4, 3.5_

  - [ ]\* 8.2 Escribir property test para los botones de acción en la tabla
    - **Propiedad 6: Botones de acción presentes solo para solicitudes pending**
    - Usar `fast-check` para generar `InstructorAccountRequestListItem[]` con estados mixtos; verificar que para cada item con `status === "pending"` se renderizan los tres botones de acción, y para items con otro estado ninguno de esos botones está presente
    - Crear `src/modules/instructor-account-requests/presentation/components/InstructorRequestsTable.test.ts`
    - **Valida: Requisito 3.5**

  - [x] 8.3 Crear `ApproveInstructorRequestButton` (Client Component)
    - Crear `src/modules/instructor-account-requests/presentation/components/ApproveInstructorRequestButton.tsx`
    - Agregar `"use client"`
    - Recibir `requestId: string` como prop
    - Usar `useTransition` para llamar a `approveInstructorAccountRequestAction`
    - Mostrar estado de carga mientras `isPending`; mostrar error inline si `success: false`
    - _Requisitos: 4.1_

  - [x] 8.4 Crear `RejectInstructorRequestButton` (Client Component)
    - Crear `src/modules/instructor-account-requests/presentation/components/RejectInstructorRequestButton.tsx`
    - Agregar `"use client"`
    - Recibir `requestId: string` como prop
    - Usar `useTransition` para llamar a `rejectInstructorAccountRequestAction`
    - Mostrar estado de carga mientras `isPending`; mostrar error inline si `success: false`
    - _Requisitos: 5.1_

  - [x] 8.5 Crear `ObserveInstructorRequestButton` (Client Component)
    - Crear `src/modules/instructor-account-requests/presentation/components/ObserveInstructorRequestButton.tsx`
    - Agregar `"use client"`
    - Recibir `requestId: string` como prop
    - Usar `useState` para alternar entre modo botón y modo formulario inline con textarea
    - Mantener el botón de confirmar deshabilitado mientras el textarea tenga cero caracteres no-whitespace
    - Usar `useTransition` para llamar a `observeInstructorAccountRequestAction`
    - Mostrar error inline si `success: false`
    - _Requisitos: 6.1, 6.2, 6.3_

  - [x] 8.6 Crear la página de administración `/admin/instructor-requests`
    - Crear `src/app/(dashboard)/admin/instructor-requests/page.tsx` como Server Component async
    - Llamar `requireAdmin()` (o el helper equivalente del proyecto) como primera operación
    - Leer `searchParams` para obtener `page` y `status` filter
    - Instanciar `SupabaseInstructorAccountRequestRepository` (composition root)
    - Llamar a `listInstructorAccountRequests` con filtro y paginación (25 por página)
    - Mapear items a `InstructorAccountRequestListItem`
    - Renderizar encabezado con título `"Solicitudes de Instructores"` y contador total
    - Renderizar selector de filtro por estado (todos, pending, approved, rejected, observed)
    - Renderizar `<InstructorRequestsTable>` con los datos
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 8.7 Agregar enlace de navegación en `DashboardNav`
    - Editar `src/app/(dashboard)/_components/DashboardNav.tsx`
    - Dentro del bloque `{isAdmin && ...}`, agregar `<NavLink href="/admin/instructor-requests">Instructores</NavLink>` junto a los demás enlaces de admin
    - _Requisito: 11.3_

- [x] 9. Checkpoint final — Verificar integración completa
  - Asegurarse de que todos los tests pasan con `pnpm vitest --run` y que `pnpm type-check` no reporta errores. Consultar al usuario si surgen dudas.

---

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Cada tarea referencia requisitos específicos para trazabilidad.
- El proyecto usa TypeScript con Next.js App Router, `fast-check` para property tests y `vitest` como test runner. Ejecutar tests con `pnpm vitest --run`.
- El módulo espeja exactamente el patrón de `src/modules/referee-registration/`. Consultar ese módulo como referencia de implementación.
- `adminSupabase` de `@/lib/supabase/admin` debe usarse en el repositorio y en el `InstructorAuthService` — nunca el cliente anónimo.
- Todos los archivos de infraestructura y el repositorio deben incluir `import "server-only"` al inicio.
- La migración SQL de la tabla `instructor_account_requests` debe ejecutarse en Supabase antes de implementar el repositorio (ver diseño para el DDL completo).
- La función `isValidStatusTransition` en este módulo acepta cuatro estados posibles (incluye `observed`), a diferencia del módulo de árbitros que solo tiene tres.
- El `InstructorAuthService` crea usuarios con `app_metadata: { role: "instructor" }` — verificar que el middleware y las rutas protegidas reconocen este rol correctamente.
- `InstructorAccountRequestListItem` excluye estructuralmente `authUserId`, `approvedBy`, `rejectedBy` y `observedBy` para cumplir el Requisito 10.6.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.5", "2.7"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.8"] },
    { "id": 4, "tasks": ["2.4", "2.6", "4.1"] },
    { "id": 5, "tasks": ["4.2", "5.1"] },
    { "id": 6, "tasks": ["5.2", "7.1", "8.1", "8.3", "8.4", "8.5"] },
    { "id": 7, "tasks": ["7.2", "7.3", "8.2", "8.6"] },
    { "id": 8, "tasks": ["8.7"] }
  ]
}
```

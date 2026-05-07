# Plan de implementación: Registro de Árbitros Oficiales

## Descripción general

Implementación incremental del módulo `referee-registration` siguiendo Clean/Screaming Architecture. Las tareas avanzan desde la capa más interna (dominio) hacia afuera (infraestructura → aplicación → presentación → páginas), garantizando que cada paso integre el código anterior sin dejar código huérfano.

## Tareas

- [x] 1. Migración de base de datos — tablas y enums
  - Crear el archivo de schema Drizzle en `src/lib/db/schema/refereeRegistrations.ts` con la tabla `referee_registrations`: columnas `id` (UUID PK), `email` (text, unique), `full_name`, `country`, `registration_number` (unique), `certificate_path`, `status` (enum `pending|approved|rejected`, default `pending`), `auth_user_id` (nullable UUID), `approved_at`, `approved_by`, `rejected_at`, `rejected_by`, `created_at`, `updated_at`.
  - Crear el archivo de schema Drizzle en `src/lib/db/schema/refereePortalPublications.ts` con la tabla `referee_portal_publications`: columnas `id` (UUID PK), `title`, `body`, `category` (enum `news|regulation|championship`), `published_at`, `created_by`, `created_at`, `updated_at`.
  - Exportar ambas tablas desde el barrel de schema (`src/lib/db/schema/index.ts`).
  - Generar y aplicar la migración SQL con Drizzle Kit.
  - _Requisitos: 12.1, 12.2, 12.3, 12.4_

- [x] 2. Capa de dominio — entidades, interfaces y errores
  - [x] 2.1 Crear entidades del dominio
    - Crear `src/modules/referee-registration/domain/entities/refereeRegistration.ts` con el tipo `RefereeRegistration`, el tipo `RefereeRegistrationStatus` y la función pura `isValidStatusTransition`.
    - Crear `src/modules/referee-registration/domain/entities/refereePortalPublication.ts` con el tipo `RefereePortalPublication` y el tipo `PublicationCategory`.
    - Ningún archivo de esta capa debe importar desde Next.js, Drizzle, Supabase ni Zod.
    - _Requisitos: 11.1, 11.2, 12.1, 12.2_

  - [ ]\* 2.2 Test de propiedad — Propiedad 3: Transición de estado válida
    - **Propiedad 3: Transición de estado válida**
    - Para cualquier par `(current, next)` de `RefereeRegistrationStatus`, `isValidStatusTransition` solo retorna `true` cuando `current === 'pending'` y `next` es `'approved'` o `'rejected'`. Para todos los demás pares debe retornar `false`.
    - **Valida: Requisitos 4.6, 5.2**

  - [x] 2.3 Crear interfaces de repositorio
    - Crear `src/modules/referee-registration/domain/interfaces/refereeRegistrationRepository.ts` con la interfaz `RefereeRegistrationRepository` y el tipo `RefereeRegistrationFilter`.
    - Crear `src/modules/referee-registration/domain/interfaces/refereePortalPublicationRepository.ts` con la interfaz `RefereePortalPublicationRepository`.
    - _Requisitos: 11.2, 11.3_

  - [x] 2.4 Crear errores de dominio
    - Crear `src/modules/referee-registration/domain/errors/index.ts` con las clases: `RefereeRegistrationNotFoundError`, `DuplicateRefereeEmailError`, `DuplicateRegistrationNumberError`, `InvalidStatusTransitionError`, `PortalPublicationNotFoundError`, `AuthUserCreationError`. Todas extienden `DomainError` de `@/lib/errors`.
    - _Requisitos: 11.1, 14.2, 14.3_

- [x] 3. Capa de infraestructura — repositorios Supabase
  - [x] 3.1 Implementar `SupabaseRefereeRegistrationRepository`
    - Crear `src/modules/referee-registration/infrastructure/repositories/supabaseRefereeRegistrationRepository.ts` marcado con `import "server-only"`.
    - Implementar todos los métodos de `RefereeRegistrationRepository`: `findById`, `findByEmail`, `findByRegistrationNumber`, `list` (con filtro de status, paginación `.range()` y `count: "exact"`), `save` (upsert), `updateStatus`.
    - Incluir métodos privados `toEntity(row)` y `toRow(entity)` para el mapeo explícito entre filas de Supabase y entidades de dominio.
    - Usar `adminSupabase` de la infraestructura compartida del proyecto.
    - _Requisitos: 11.3, 11.4, 12.1, 3.5_

  - [ ]\* 3.2 Test de propiedad — Propiedad 11: Round-trip de serialización
    - **Propiedad 11: Round-trip de serialización de registros**
    - Para cualquier `RefereeRegistration` válida generada aleatoriamente, `toEntity(toRow(entity))` debe producir un objeto profundamente igual al original.
    - **Valida: Requisito 11.3**

  - [x] 3.3 Implementar `SupabaseRefereePortalPublicationRepository`
    - Crear `src/modules/referee-registration/infrastructure/repositories/supabaseRefereePortalPublicationRepository.ts` marcado con `import "server-only"`.
    - Implementar todos los métodos de `RefereePortalPublicationRepository`: `findById`, `list` (ordenado por `published_at DESC`), `save` (upsert), `delete`.
    - Incluir métodos privados `toEntity(row)` y `toRow(entity)`.
    - _Requisitos: 11.3, 11.4, 8.2, 8.5_

- [ ] 4. Checkpoint — Verificar capa de dominio e infraestructura
  - Asegurarse de que todos los tests pasen. Consultar al usuario si surgen dudas.

- [x] 5. Casos de uso — registro y gestión de árbitros
  - [x] 5.1 Implementar `submitRefereeRegistration`
    - Crear `src/modules/referee-registration/application/use-cases/submitRefereeRegistration.ts`.
    - Definir el schema Zod `SubmitRefereeRegistrationInput` con los campos: `email`, `fullName`, `country`, `registrationNumber`, `certificatePath`.
    - Verificar unicidad de email con `repo.findByEmail`; lanzar `DuplicateRefereeEmailError` si existe.
    - Verificar unicidad de número de registro con `repo.findByRegistrationNumber`; lanzar `DuplicateRegistrationNumberError` si existe.
    - Crear el registro con `status: 'pending'` y persistir con `repo.save`.
    - Retornar `{ id: string }`.
    - _Requisitos: 2.2, 2.4, 11.3_

  - [ ]\* 5.2 Test de propiedad — Propiedad 7: Validación de campos obligatorios
    - **Propiedad 7: Validación de campos obligatorios del formulario**
    - Para cualquier input con al menos un campo obligatorio ausente o inválido (email malformado, string vacío, etc.), el schema Zod `SubmitRefereeRegistrationInput` debe rechazarlo (`.safeParse` retorna `success: false`).
    - **Valida: Requisito 2.3**

  - [ ]\* 5.3 Test de propiedad — Propiedad 1: Unicidad de email
    - **Propiedad 1: Unicidad de email en registros**
    - Para cualquier par de inputs con el mismo email, el segundo `submitRefereeRegistration` debe lanzar `DuplicateRefereeEmailError` sin crear un segundo registro.
    - **Valida: Requisito 12.3**

  - [ ]\* 5.4 Test de propiedad — Propiedad 2: Unicidad de número de registro
    - **Propiedad 2: Unicidad de número de registro oficial**
    - Para cualquier par de inputs con el mismo `registrationNumber`, el segundo `submitRefereeRegistration` debe lanzar `DuplicateRegistrationNumberError` sin crear un segundo registro.
    - **Valida: Requisito 12.4**

  - [x] 5.5 Implementar `approveRefereeRegistration`
    - Crear `src/modules/referee-registration/application/use-cases/approveRefereeRegistration.ts`.
    - Definir el schema Zod `ApproveRefereeRegistrationInput` con `{ id: string; adminId: string }`.
    - Obtener el registro con `repo.findById`; lanzar `RefereeRegistrationNotFoundError` si no existe.
    - Verificar `isValidStatusTransition(current, 'approved')`; lanzar `InvalidStatusTransitionError` si no es válida.
    - Llamar a `authService.inviteRefereeUser(email)` para crear el usuario Auth con `app_metadata.role = 'referee'` y enviar el email de invitación. Si falla, lanzar `AuthUserCreationError` sin modificar el registro.
    - Solo si el usuario Auth se crea exitosamente, llamar a `repo.updateStatus(id, 'approved', { adminId, authUserId, timestamp })`.
    - Aceptar `deps: { repo: RefereeRegistrationRepository; authService: RefereeAuthService }`.
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]\* 5.6 Test de propiedad — Propiedad 4: Consistencia aprobación–cuenta Auth
    - **Propiedad 4: Consistencia aprobación–cuenta Auth**
    - Para cualquier registro aprobado exitosamente, el campo `authUserId` del registro resultante debe ser no nulo y el `authService` debe haber sido invocado exactamente una vez con el email correcto.
    - **Valida: Requisitos 4.2, 4.3**

  - [x] 5.7 Implementar `rejectRefereeRegistration`
    - Crear `src/modules/referee-registration/application/use-cases/rejectRefereeRegistration.ts`.
    - Definir el schema Zod `RejectRefereeRegistrationInput` con `{ id: string; adminId: string }`.
    - Obtener el registro; lanzar `RefereeRegistrationNotFoundError` si no existe.
    - Verificar `isValidStatusTransition(current, 'rejected')`; lanzar `InvalidStatusTransitionError` si no es válida.
    - Llamar a `repo.updateStatus(id, 'rejected', { adminId, timestamp })`.
    - _Requisitos: 5.1, 5.2_

  - [x] 5.8 Implementar `updateRefereeRegistration`
    - Crear `src/modules/referee-registration/application/use-cases/updateRefereeRegistration.ts`.
    - Definir el schema Zod `UpdateRefereeRegistrationInput` con `{ id, fullName, country, registrationNumber }`. El campo `email` no es editable.
    - Obtener el registro; lanzar `RefereeRegistrationNotFoundError` si no existe.
    - Persistir los cambios con `repo.save` actualizando `updatedAt`.
    - _Requisitos: 6.1, 6.2, 6.3, 6.4_

  - [x] 5.9 Implementar `listRefereeRegistrations` y `getRefereeRegistrationById`
    - Crear `src/modules/referee-registration/application/use-cases/listRefereeRegistrations.ts`: acepta `RefereeRegistrationFilter`, delega a `repo.list`, retorna `{ items, total }`.
    - Crear `src/modules/referee-registration/application/use-cases/getRefereeRegistrationById.ts`: obtiene por id, lanza `RefereeRegistrationNotFoundError` si no existe.
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.10 Implementar casos de uso de publicaciones del portal
    - Crear `src/modules/referee-registration/application/use-cases/createPortalPublication.ts`: valida con Zod `{ title, body, category, createdBy }`, persiste con `repo.save`.
    - Crear `src/modules/referee-registration/application/use-cases/updatePortalPublication.ts`: obtiene por id, lanza `PortalPublicationNotFoundError` si no existe, actualiza y persiste.
    - Crear `src/modules/referee-registration/application/use-cases/deletePortalPublication.ts`: obtiene por id, lanza `PortalPublicationNotFoundError` si no existe, llama a `repo.delete`.
    - Crear `src/modules/referee-registration/application/use-cases/listPortalPublications.ts`: delega a `repo.list`, retorna `RefereePortalPublication[]`.
    - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 6. Checkpoint — Verificar capa de aplicación
  - Asegurarse de que todos los tests pasen. Consultar al usuario si surgen dudas.

- [x] 7. Server Actions — capa de presentación
  - [x] 7.1 Implementar `refereeRegistrationActions.ts` (acciones públicas)
    - Crear `src/modules/referee-registration/presentation/actions/refereeRegistrationActions.ts` con `"use server"` al inicio.
    - Implementar `submitRefereeRegistrationAction(rawInput: unknown): Promise<ActionResult<{ id: string }>>`:
      - Validar input con Zod (sin requerir autenticación).
      - Instanciar `SupabaseRefereeRegistrationRepository` (composition root).
      - Llamar al use case `submitRefereeRegistration`.
      - Mapear `DuplicateRefereeEmailError` y `DuplicateRegistrationNumberError` a `{ success: false, code: "CONFLICT" }`.
      - Capturar errores inesperados, loguear server-side, retornar `{ success: false, code: "INTERNAL_ERROR" }`.
    - _Requisitos: 2.2, 2.3, 2.4, 14.1, 14.2, 14.3, 14.4_

  - [ ]\* 7.2 Test de propiedad — Propiedad 10: Autorización en Server Actions
    - **Propiedad 10: Autorización en Server Actions**
    - Para cualquier invocación de una Server Action de administración (`approveRefereeRegistrationAction`, `rejectRefereeRegistrationAction`, `updateRefereeRegistrationAction`, `createPortalPublicationAction`, `updatePortalPublicationAction`, `deletePortalPublicationAction`) con una sesión no-admin o sin sesión, la acción debe retornar `{ success: false, code: "FORBIDDEN" }` sin ejecutar ninguna mutación.
    - **Valida: Requisito 10.1**

  - [x] 7.3 Implementar `adminRefereeActions.ts` (acciones de administración)
    - Crear `src/modules/referee-registration/presentation/actions/adminRefereeActions.ts` con `"use server"` al inicio.
    - Todas las acciones siguen el patrón: `requireAdminUser()` → validar Zod → instanciar repositorios → llamar use case → `revalidatePath('/admin/referee-registrations')` → retornar `ActionResult`.
    - Implementar `approveRefereeRegistrationAction({ id })`: llama a `approveRefereeRegistration`; mapea `InvalidStatusTransitionError` a `CONFLICT`, `AuthUserCreationError` a `INTERNAL_ERROR`.
    - Implementar `rejectRefereeRegistrationAction({ id })`: llama a `rejectRefereeRegistration`; mapea `InvalidStatusTransitionError` a `CONFLICT`.
    - Implementar `updateRefereeRegistrationAction({ id, fullName, country, registrationNumber })`: llama a `updateRefereeRegistration`.
    - Implementar `getSignedCertificateUrlAction({ id })`: obtiene el registro, genera signed URL con `adminSupabase.storage.from('referee-certificates').createSignedUrl(path, 3600)`, retorna `ActionResult<{ url: string }>`.
    - Implementar `createPortalPublicationAction`, `updatePortalPublicationAction`, `deletePortalPublicationAction`: llaman a los use cases correspondientes; `revalidatePath('/admin/referee-registrations/publications')`.
    - _Requisitos: 4.1–4.6, 5.1–5.2, 6.1–6.4, 8.1–8.5, 9.1–9.3, 10.1, 10.5, 14.1–14.4_

- [x] 8. Componentes React — formulario público y portal
  - [x] 8.1 Implementar `RefereeRegistrationForm`
    - Crear `src/modules/referee-registration/presentation/components/RefereeRegistrationForm.tsx` con `"use client"`.
    - Renderizar campos: email, nombre completo, país, número de registro, input de archivo PDF.
    - Validar en cliente con Zod antes de enviar: campos obligatorios, tipo MIME `application/pdf`, tamaño máximo 10 MB.
    - Al seleccionar el archivo, subir el PDF a Supabase Storage usando `createClient()` (browser client) bajo la ruta `referee-certificates/{tempId}/{timestamp}_{filename}`.
    - Llamar a `submitRefereeRegistrationAction` con los datos validados y la ruta del certificado.
    - Mostrar estados de carga, mensaje de confirmación en éxito, y errores descriptivos por campo en fallo.
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 14.5_

  - [ ]\* 8.2 Test de propiedad — Propiedad 8: Solo PDFs aceptados
    - **Propiedad 8: Solo PDFs aceptados**
    - Para cualquier tipo MIME distinto de `application/pdf` generado aleatoriamente, la función de validación del formulario debe retornar un error y no invocar la subida a Storage.
    - **Valida: Requisito 2.6**

  - [ ]\* 8.3 Test de propiedad — Propiedad 9: Tamaño máximo del certificado
    - **Propiedad 9: Tamaño máximo del certificado**
    - Para cualquier tamaño de archivo `size > 10 * 1024 * 1024` bytes, la función de validación del formulario debe retornar un error y no invocar la subida a Storage.
    - **Valida: Requisito 2.7**

  - [ ]\* 8.4 Test de propiedad — Propiedad 5: Ruta del certificado PDF
    - **Propiedad 5: Ruta del certificado PDF**
    - Para cualquier `registrationId` y `filename` válidos, la ruta generada para el certificado debe coincidir con el patrón `referee-certificates/{registrationId}/{filename}`.
    - **Valida: Requisito 2.5**

  - [x] 8.5 Implementar `PortalPublicationList`
    - Crear `src/modules/referee-registration/presentation/components/PortalPublicationList.tsx` como Server Component (sin `"use client"`).
    - Recibir `publications: RefereePortalPublication[]` como prop serializable.
    - Renderizar cada publicación con título, categoría (badge), cuerpo y fecha de publicación formateada.
    - Mostrar mensaje de estado vacío cuando no hay publicaciones.
    - _Requisitos: 7.5, 7.6_

  - [x] 8.6 Implementar `RefereeRegistrationTable`
    - Crear `src/modules/referee-registration/presentation/components/RefereeRegistrationTable.tsx` con `"use client"`.
    - Recibir `registrations: RefereeRegistrationRow[]`, `currentPage: number`, `totalPages: number` como props.
    - Renderizar columnas: nombre completo, email, país, número de registro, estado (badge), fecha de envío.
    - Mostrar botones de acción según estado: "Aprobar" y "Rechazar" solo para `pending`; "Ver PDF" siempre; "Editar" siempre.
    - Mostrar mensaje de estado vacío cuando no hay registros.
    - _Requisitos: 3.2, 3.4_

  - [x] 8.7 Implementar `ApproveRegistrationButton` y `RejectRegistrationButton`
    - Crear `src/modules/referee-registration/presentation/components/ApproveRegistrationButton.tsx` con `"use client"`.
    - Usar `useTransition` para invocar `approveRefereeRegistrationAction({ id })`.
    - Mostrar estado de carga durante la transición y manejar errores mostrando un mensaje al usuario.
    - Crear `src/modules/referee-registration/presentation/components/RejectRegistrationButton.tsx` con la misma estructura para `rejectRefereeRegistrationAction`.
    - _Requisitos: 4.1, 4.6, 5.1, 5.2_

  - [x] 8.8 Implementar `EditRegistrationForm`
    - Crear `src/modules/referee-registration/presentation/components/EditRegistrationForm.tsx` con `"use client"`.
    - Recibir `registration: RefereeRegistrationRow` como prop.
    - Renderizar campos editables: nombre completo, país, número de registro. El campo email debe mostrarse como solo lectura.
    - Validar con Zod en cliente antes de enviar.
    - Llamar a `updateRefereeRegistrationAction` y mostrar feedback de éxito o error.
    - _Requisitos: 6.1, 6.2, 6.3, 6.4_

  - [x] 8.9 Implementar `PublicationForm`
    - Crear `src/modules/referee-registration/presentation/components/PublicationForm.tsx` con `"use client"`.
    - Renderizar campos: título, cuerpo (textarea), categoría (select: `news | regulation | championship`).
    - Soportar modo creación y modo edición (recibir `publication?: RefereePortalPublication` como prop opcional).
    - Llamar a `createPortalPublicationAction` o `updatePortalPublicationAction` según el modo.
    - Mostrar errores de validación y confirmación de éxito.
    - _Requisitos: 8.1, 8.2, 8.3, 8.4_

- [ ] 9. Checkpoint — Verificar componentes y Server Actions
  - Asegurarse de que todos los tests pasen. Consultar al usuario si surgen dudas.

- [x] 10. Páginas Next.js App Router
  - [x] 10.1 Crear página pública de registro `/referee-registration`
    - Crear `src/app/referee-registration/page.tsx` como Server Component.
    - Renderizar el layout público de la página con encabezado descriptivo y el componente `RefereeRegistrationForm`.
    - _Requisitos: 1.1, 1.3, 2.1_

  - [x] 10.2 Crear layout y página del portal de árbitros `/referee/dashboard`
    - Crear `src/app/referee/layout.tsx` como Server Component con la función `requireRefereeUser()`:
      - Obtener sesión con `createClient()`.
      - Si no hay usuario, redirigir a `/login`.
      - Si `app_metadata.role !== 'referee'`, redirigir a `/dashboard`.
    - Crear `src/app/referee/dashboard/page.tsx` como Server Component:
      - Instanciar `SupabaseRefereePortalPublicationRepository` y llamar a `listPortalPublications`.
      - Pasar las publicaciones al componente `PortalPublicationList`.
    - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 10.3 Crear página de listado de registros `/admin/referee-registrations`
    - Crear `src/app/(dashboard)/admin/referee-registrations/page.tsx` como Server Component.
    - Leer parámetros de búsqueda `status` y `page` de `searchParams`.
    - Instanciar `SupabaseRefereeRegistrationRepository` y llamar a `listRefereeRegistrations` con el filtro.
    - Calcular `totalPages` a partir de `total` y `pageSize` (25).
    - Renderizar `RefereeRegistrationTable` con los datos serializados.
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 10.2_

  - [x] 10.4 Crear página de detalle/edición de registro `/admin/referee-registrations/[id]`
    - Crear `src/app/(dashboard)/admin/referee-registrations/[id]/page.tsx` como Server Component.
    - Obtener el registro por id con `getRefereeRegistrationById`; llamar a `notFound()` si no existe.
    - Renderizar `EditRegistrationForm` con los datos del registro.
    - _Requisitos: 6.1, 9.1, 9.2, 9.3_

  - [x] 10.5 Crear páginas de publicaciones del portal `/admin/referee-registrations/publications`
    - Crear `src/app/(dashboard)/admin/referee-registrations/publications/page.tsx` como Server Component: listar publicaciones con `listPortalPublications` y renderizar la lista con botones de editar y eliminar.
    - Crear `src/app/(dashboard)/admin/referee-registrations/publications/new/page.tsx`: renderizar `PublicationForm` en modo creación.
    - _Requisitos: 8.1, 8.4, 8.5_

- [x] 11. Middleware y control de acceso
  - Modificar `middleware.ts` para agregar `/referee-registration` al array `PUBLIC_ROUTES` (o equivalente en el proyecto), garantizando que la ruta sea accesible sin sesión.
  - Verificar que las rutas `/referee/*` pasen por `updateSession` para que el layout pueda leer la sesión correctamente.
  - Verificar que las rutas `/admin/referee-registrations/*` estén protegidas por el guard de admin existente.
  - _Requisitos: 1.3, 1.4, 7.2, 10.2_

- [x] 12. Integración con navegación pública
  - Modificar el componente `PublicNav` (o equivalente en el proyecto) para agregar un enlace de navegación a `/referee-registration` con el texto "Regístrate como árbitro".
  - Modificar la página principal (`/`) para incluir un call-to-action visible que enlace a `/referee-registration` con el texto "Regístrate como árbitro".
  - _Requisitos: 1.2, 13.1, 13.2_

- [x] 13. Agregar enlace de navegación al panel de administración
  - Modificar `DashboardNav` (o el componente de navegación del dashboard) para incluir un enlace a `/admin/referee-registrations` visible para usuarios con rol admin.
  - _Requisitos: 3.1_

- [x] 14. Checkpoint final — Verificar integración completa
  - Asegurarse de que todos los tests pasen y que los flujos principales funcionen end-to-end mediante tests automatizados. Consultar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Cada tarea referencia los requisitos específicos que implementa para trazabilidad completa.
- Los checkpoints garantizan validación incremental antes de avanzar a la siguiente capa.
- Los tests de propiedades validan invariantes universales del sistema; los tests unitarios validan ejemplos y casos borde específicos.
- El orden de las tareas respeta la regla de dependencias de Clean Architecture: dominio → infraestructura → aplicación → presentación → páginas.
- `adminSupabase` (service role) solo debe aparecer en la capa de infraestructura y en Server Actions; nunca en componentes cliente.
- Todos los archivos de infraestructura y Server Actions deben estar marcados con `import "server-only"`.

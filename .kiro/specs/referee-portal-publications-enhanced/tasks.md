# Plan de Implementación: Portal de Árbitros — Publicaciones Mejoradas

## Descripción General

Implementación incremental siguiendo la dirección de dependencias de Clean Architecture: base de datos → dominio → aplicación → infraestructura → server actions → presentación (admin) → presentación (árbitro) → tests de propiedades.

## Tareas

- [x] 1. Migración de base de datos
  - Crear el archivo `src/lib/db/migrations/034_referee_portal_publications_enhanced.sql`
  - Agregar columnas `cover_image_path`, `is_event`, `event_date`, `event_location`, `max_participants` y `registration_deadline` a la tabla `referee_portal_publications`
  - Agregar los constraints `chk_event_fields_require_is_event` y `chk_is_event_requires_championship`
  - Crear la tabla `referee_event_registrations` con clave foránea `ON DELETE CASCADE` hacia `referee_portal_publications`
  - Agregar el constraint de unicidad `uq_referee_event_registration` sobre `(publication_id, referee_user_id)`
  - Crear los índices `idx_referee_event_registrations_publication` e `idx_referee_event_registrations_referee`
  - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 2. Capa de dominio
  - [x] 2.1 Extender la entidad `RefereePortalPublication`
    - Modificar `src/modules/referee-registration/domain/entities/refereePortalPublication.ts`
    - Agregar los campos: `coverImagePath: string | null`, `isEvent: boolean`, `eventDate: string | null`, `eventLocation: string | null`, `maxParticipants: number | null`, `registrationDeadline: string | null`
    - Documentar las reglas de dominio: `isEvent` solo puede ser `true` cuando `category === "championship"`; si `isEvent === false` los campos de evento deben ser `null`
    - _Requisitos: 8.1, 8.2_

  - [x] 2.2 Crear la entidad `RefereeEventRegistration`
    - Crear `src/modules/referee-registration/domain/entities/refereeEventRegistration.ts`
    - Definir la interfaz con campos: `id`, `publicationId`, `refereeUserId`, `registeredAt`, `createdAt`
    - _Requisitos: 6.4, 8.3_

  - [x] 2.3 Extender la interfaz `RefereePortalPublicationRepository`
    - Modificar `src/modules/referee-registration/domain/interfaces/refereePortalPublicationRepository.ts`
    - Agregar el método `listEvents(): Promise<RefereePortalPublication[]>` que retorna solo publicaciones con `isEvent === true`
    - _Requisitos: 5.4_

  - [x] 2.4 Crear la interfaz `RefereeEventRegistrationRepository`
    - Crear `src/modules/referee-registration/domain/interfaces/refereeEventRegistrationRepository.ts`
    - Definir la interfaz extendida `RefereeEventRegistrationWithRefereeInfo` con campos `refereeName` y `refereeEmail`
    - Definir los métodos: `findById`, `findByPublicationAndReferee`, `findByPublication`, `countByPublication`, `save`, `delete`
    - _Requisitos: 4.2, 4.9, 5.4_

  - [x] 2.5 Agregar nuevas clases de error de dominio
    - Modificar `src/modules/referee-registration/domain/errors/index.ts`
    - Agregar: `AlreadyRegisteredForEventError`, `EventAtCapacityError`, `RegistrationDeadlinePassedError`, `RefereeEventRegistrationNotFoundError`, `NotAnEventError`, `StorageUploadError`
    - _Requisitos: 4.4, 4.5, 4.6, 4.10, 8.5_

- [x] 3. Capa de aplicación
  - [x] 3.1 Extender el caso de uso `createPortalPublication`
    - Modificar `src/modules/referee-registration/application/use-cases/createPortalPublication.ts`
    - Agregar al schema de entrada los campos opcionales: `coverImagePath`, `isEvent`, `eventDate`, `eventLocation`, `maxParticipants`, `registrationDeadline`
    - Aplicar la regla de dominio: si `isEvent === false` o `category !== "championship"`, forzar los campos de evento a `null` antes de persistir
    - _Requisitos: 8.1, 8.2_

  - [x] 3.2 Extender el caso de uso `updatePortalPublication`
    - Modificar `src/modules/referee-registration/application/use-cases/updatePortalPublication.ts`
    - Agregar al schema de entrada los mismos campos opcionales que en `createPortalPublication`
    - Aplicar la misma regla de dominio para campos de evento
    - _Requisitos: 8.1, 8.2_

  - [x] 3.3 Extender el caso de uso `deletePortalPublication`
    - Modificar `src/modules/referee-registration/application/use-cases/deletePortalPublication.ts`
    - Agregar dependencia `storageService` con método `deleteFile(path: string): Promise<void>` al objeto `deps`
    - Antes de eliminar el registro, si `publication.coverImagePath` no es nulo, intentar eliminar el archivo del Storage; si falla, registrar el error en el servidor y continuar con la eliminación del registro
    - _Requisitos: 1.9, 1.10_

  - [x] 3.4 Crear el caso de uso `registerForEvent`
    - Crear `src/modules/referee-registration/application/use-cases/registerForEvent.ts`
    - Definir el schema de entrada con `publicationId` (UUID) y `refereeUserId` (UUID)
    - Verificar que la publicación existe y tiene `isEvent === true`; lanzar `NotAnEventError` si no
    - Verificar que el deadline no ha pasado; lanzar `RegistrationDeadlinePassedError` si pasó
    - Verificar que no existe inscripción previa; lanzar `AlreadyRegisteredForEventError` si existe
    - Verificar cupo disponible cuando `maxParticipants` no es nulo; lanzar `EventAtCapacityError` si está lleno
    - Crear y persistir la nueva `RefereeEventRegistration` con `randomUUID()`
    - _Requisitos: 4.2, 4.4, 4.5, 4.6, 4.7, 8.3, 8.4, 8.5_

  - [x] 3.5 Crear el caso de uso `unregisterFromEvent`
    - Crear `src/modules/referee-registration/application/use-cases/unregisterFromEvent.ts`
    - Definir el schema de entrada con `publicationId` (UUID) y `refereeUserId` (UUID)
    - Buscar la inscripción por `(publicationId, refereeUserId)`; lanzar `RefereeEventRegistrationNotFoundError` si no existe
    - Eliminar la inscripción por su `id`
    - _Requisitos: 4.9, 4.10_

  - [x] 3.6 Crear el caso de uso `listEventRegistrations`
    - Crear `src/modules/referee-registration/application/use-cases/listEventRegistrations.ts`
    - Definir el schema de entrada con `publicationId` (UUID)
    - Verificar que la publicación existe y tiene `isEvent === true`; lanzar `NotAnEventError` si no
    - Retornar `RefereeEventRegistrationWithRefereeInfo[]` usando `repo.findByPublication(publicationId)`
    - _Requisitos: 5.4, 5.5_

- [x] 4. Punto de control — verificar compilación TypeScript
  - Ejecutar `tsc --noEmit` para verificar que las capas de dominio y aplicación compilan sin errores
  - Asegurarse de que no hay importaciones cruzadas que violen la dirección de dependencias de Clean Architecture

- [x] 5. Capa de infraestructura
  - [x] 5.1 Extender `SupabaseRefereePortalPublicationRepository`
    - Modificar `src/modules/referee-registration/infrastructure/repositories/supabaseRefereePortalPublicationRepository.ts`
    - Actualizar `RefereePortalPublicationRowSchema` para incluir las nuevas columnas: `cover_image_path`, `is_event`, `event_date`, `event_location`, `max_participants`, `registration_deadline`
    - Actualizar los métodos `toEntity` y `toRow` para mapear los nuevos campos (snake_case ↔ camelCase)
    - Implementar el método `listEvents()` con filtro `.eq("is_event", true)`
    - _Requisitos: 6.1, 8.1, 8.2_

  - [x] 5.2 Crear `SupabaseRefereeEventRegistrationRepository`
    - Crear `src/modules/referee-registration/infrastructure/repositories/supabaseRefereeEventRegistrationRepository.ts`
    - Agregar `import "server-only"` al inicio del archivo
    - Definir `RefereeEventRegistrationRowSchema` con Zod para validación en tiempo de ejecución
    - Implementar todos los métodos de la interfaz: `findById`, `findByPublicationAndReferee`, `findByPublication` (con JOIN a `referee_registrations` para obtener nombre y email), `countByPublication`, `save`, `delete`
    - Usar `adminSupabase` para todas las operaciones
    - _Requisitos: 4.2, 4.9, 5.1, 5.4_

- [x] 6. Server Actions — capa de presentación
  - [x] 6.1 Extender `adminRefereeActions` con soporte de imagen y campos de evento
    - Modificar `src/modules/referee-registration/presentation/actions/adminRefereeActions.ts`
    - Actualizar `createPortalPublicationAction`: aceptar `FormData` en lugar de objeto plano; extraer el archivo `coverImage`; validar tipo MIME en servidor (`image/jpeg`, `image/png`, `image/webp`) y tamaño (≤ 5 MB); generar el `publicationId` con `randomUUID()` antes del upload; subir la imagen a `referee-portal-images/{publicationId}/cover.{ext}` usando `adminSupabase.storage`; si el upload falla retornar `{ success: false, error: "Error al subir la imagen. Por favor intenta nuevamente.", code: "STORAGE_ERROR" }` sin persistir; agregar campos de evento al schema Zod
    - Actualizar `updatePortalPublicationAction`: misma lógica de imagen; si se sube nueva imagen, eliminar la anterior del Storage antes de subir la nueva; agregar campos de evento al schema Zod
    - Actualizar `deletePortalPublicationAction`: inyectar un `storageService` que use `adminSupabase.storage` para eliminar el archivo; pasar como dependencia al caso de uso `deletePortalPublication`
    - _Requisitos: 1.4, 1.5, 1.6, 1.9, 1.10, 3.5, 3.6, 3.7, 7.2, 7.5, 7.6, 7.9_

  - [x] 6.2 Crear `refereeEventActions`
    - Crear `src/modules/referee-registration/presentation/actions/refereeEventActions.ts`
    - Agregar `"use server"` al inicio del archivo
    - Implementar `requireReferee()`: verificar sesión con `createClient()`, verificar que el usuario tiene `app_metadata.role === "referee"` en Supabase Auth; retornar `{ refereeUserId: string }` o `null`
    - Implementar `registerForEventAction(rawInput: unknown)`: llamar `requireReferee()`; validar `publicationId` con Zod; instanciar repositorios; llamar `registerForEvent`; mapear errores de dominio a `ActionResult`; llamar `revalidatePath("/referee/dashboard")`
    - Implementar `unregisterFromEventAction(rawInput: unknown)`: misma estructura; verificar ownership de la inscripción antes de eliminar; llamar `unregisterFromEvent`; mapear errores; revalidar
    - _Requisitos: 4.1, 4.2, 4.3, 4.8, 4.9, 4.10, 7.3, 7.4, 7.9, 7.10_

- [x] 7. Presentación — vista del administrador
  - [x] 7.1 Crear el componente `ImageUploadField`
    - Crear `src/modules/referee-registration/presentation/components/ImageUploadField.tsx`
    - Agregar `"use client"` al inicio del archivo
    - Aceptar props: `name: string`, `defaultImagePath?: string | null`, `disabled?: boolean`
    - Implementar previsualización con `URL.createObjectURL` al seleccionar un archivo
    - Validar en el cliente: tipo MIME (`image/jpeg`, `image/png`, `image/webp`) y tamaño (≤ 5 MB); mostrar error de validación si no cumple
    - Si `defaultImagePath` existe, mostrar la imagen actual como previsualización inicial
    - _Requisitos: 1.1, 1.2, 1.3_

  - [x] 7.2 Extender `PublicationForm` con imagen y campos de evento
    - Modificar `src/modules/referee-registration/presentation/components/PublicationForm.tsx`
    - Integrar el componente `ImageUploadField` para el campo `coverImage`
    - Agregar el checkbox `isEvent` visible solo cuando `category === "championship"`
    - Agregar los campos condicionales `eventDate`, `eventLocation`, `maxParticipants` y `registrationDeadline`, visibles solo cuando `isEvent` está marcado
    - Cambiar el `handleSubmit` para construir un `FormData` y enviarlo a las acciones (en lugar de un objeto plano), para soportar el archivo de imagen
    - Actualizar el schema Zod del cliente para incluir los nuevos campos con sus validaciones
    - _Requisitos: 1.1, 1.2, 1.3, 3.5, 3.6, 3.7_

  - [x] 7.3 Crear el componente `AdminPublicationCard`
    - Crear `src/modules/referee-registration/presentation/components/AdminPublicationCard.tsx`
    - Server Component (sin `"use client"`)
    - Aceptar props: `publication: RefereePortalPublication`, `registrationCount?: number`
    - Mostrar thumbnail de imagen de portada si `coverImagePath` no es nulo (usando URL pública del bucket o signed URL)
    - Mostrar badge de categoría con el color correspondiente
    - Si `isEvent === true`, mostrar indicador "Evento" con el contador de inscritos
    - Renderizar botones "Editar" (Link) y "Eliminar" (componente `DeletePublicationButton` existente)
    - _Requisitos: 3.1, 3.2, 3.3, 3.4_

  - [x] 7.4 Actualizar la página de lista de publicaciones del admin
    - Modificar `src/app/(dashboard)/admin/referee-registrations/publications/page.tsx`
    - Obtener el conteo de inscritos por evento en paralelo con las publicaciones usando `Promise.all()`
    - Reemplazar el `<li>` inline por el componente `AdminPublicationCard`
    - _Requisitos: 3.1, 3.2, 3.3, 3.4_

  - [x] 7.5 Crear la página de inscritos a un evento (admin)
    - Crear `src/app/(dashboard)/admin/referee-registrations/publications/[publicationId]/registrations/page.tsx`
    - Server Component con `requireAdminUser()` al inicio
    - Obtener la publicación por `publicationId`; si no existe o `isEvent === false`, llamar `notFound()`
    - Llamar al caso de uso `listEventRegistrations` inyectando `SupabaseRefereeEventRegistrationRepository` y `SupabaseRefereePortalPublicationRepository`
    - Renderizar una tabla con columnas: nombre completo, email y fecha de inscripción de cada árbitro
    - Mostrar mensaje vacío si no hay inscritos
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Punto de control — verificar compilación y lint
  - Ejecutar `tsc --noEmit` para verificar que toda la capa de presentación admin compila sin errores
  - Verificar que no hay imports de repositorios o `adminSupabase` en Client Components

- [x] 9. Presentación — vista del árbitro
  - [x] 9.1 Crear el componente `PublicationCard`
    - Crear `src/modules/referee-registration/presentation/components/PublicationCard.tsx`
    - Server Component (sin `"use client"`)
    - Aceptar props: `publication: RefereePortalPublication`
    - Implementar las variantes visuales según categoría:
      - `news`: imagen de portada prominente (si existe) + título + extracto del cuerpo (máx 3 líneas) + fecha + badge azul "Noticias"
      - `regulation`: ícono de documento + título + fecha + badge ámbar "Reglamento" (sin imagen prominente)
      - `championship` con `isEvent === false`: imagen de portada (si existe) + título + extracto + fecha + badge verde esmeralda "Campeonato"
    - Cuando `coverImagePath` es nulo, renderizar un diseño alternativo coherente sin imagen
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 1.7, 1.8_

  - [x] 9.2 Crear el componente `EventRegistrationButton`
    - Crear `src/modules/referee-registration/presentation/components/EventRegistrationButton.tsx`
    - Agregar `"use client"` al inicio del archivo
    - Aceptar props: `publicationId: string`, `isRegistered: boolean`, `isDeadlinePassed: boolean`, `isFull: boolean`
    - Usar `useTransition` para manejar el estado de carga y deshabilitar el botón durante la petición
    - Llamar a `registerForEventAction` o `unregisterFromEventAction` según el estado actual
    - Actualizar el estado visual optimistamente tras la respuesta exitosa
    - Deshabilitar el botón con mensaje descriptivo cuando `isDeadlinePassed === true` o `isFull === true`
    - _Requisitos: 4.1, 4.3, 4.8, 4.11, 4.12, 4.13_

  - [x] 9.3 Crear el componente `EventCard`
    - Crear `src/modules/referee-registration/presentation/components/EventCard.tsx`
    - Server Component (sin `"use client"`)
    - Aceptar props: `publication: RefereePortalPublication`, `isRegistered: boolean`, `refereeUserId: string`
    - Mostrar banner visual con etiqueta "EVENTO" en verde esmeralda
    - Mostrar imagen de portada (si existe), título, fecha del evento, lugar del evento
    - Calcular y mostrar cupos disponibles: `maxParticipants - registrationCount` (o "Sin límite de cupos" si `maxParticipants` es nulo)
    - Calcular `isDeadlinePassed` y `isFull` en el servidor y pasarlos como props al `EventRegistrationButton`
    - Renderizar `EventRegistrationButton` con los props calculados
    - _Requisitos: 2.5, 4.11, 4.12_

  - [x] 9.4 Extender `PortalPublicationList`
    - Modificar `src/modules/referee-registration/presentation/components/PortalPublicationList.tsx`
    - Actualizar las props para aceptar: `publications: RefereePortalPublication[]`, `eventRegistrations: RefereeEventRegistration[]`, `refereeUserId: string`
    - Para cada publicación, determinar si es un evento (`isEvent === true`) y delegar a `EventCard`; de lo contrario delegar a `PublicationCard`
    - Calcular `isRegistered` para cada evento comparando `publication.id` con los `publicationId` de `eventRegistrations`
    - Mantener el mensaje de lista vacía cuando no hay publicaciones
    - _Requisitos: 2.1, 2.5, 2.6, 2.7_

  - [x] 9.5 Extender la página del dashboard del árbitro
    - Modificar `src/app/referee/dashboard/page.tsx`
    - Obtener en paralelo con `Promise.all()`: las publicaciones (caso de uso `listPortalPublications`) y las inscripciones del árbitro actual (usando `SupabaseRefereeEventRegistrationRepository.findByReferee(refereeUserId)`)
    - Obtener el `refereeUserId` del usuario autenticado mediante `createClient()` y `supabase.auth.getUser()`
    - Pasar `publications`, `eventRegistrations` y `refereeUserId` como props a `PortalPublicationList`
    - _Requisitos: 2.7, 7.1_

- [x] 10. Punto de control final — verificar compilación completa
  - Ejecutar `tsc --noEmit` para verificar que todo el proyecto compila sin errores de tipos
  - Asegurarse de que todos los componentes nuevos y modificados siguen las reglas de renderizado (Server vs Client)

- [ ] 11. Tests de propiedades con fast-check
  - [ ]\* 11.1 Escribir test de propiedad para Propiedad 1 — Consistencia de campos de evento
    - **Propiedad 1: Consistencia de campos de evento**
    - Generar publicaciones arbitrarias con `isEvent = false` usando `fc.record`
    - Verificar que al pasar por el caso de uso `createPortalPublication`, los campos `eventDate`, `eventLocation`, `maxParticipants` y `registrationDeadline` son siempre `null` en la entidad resultante
    - **Valida: Requisitos 8.1, 8.2**

  - [ ]\* 11.2 Escribir test de propiedad para Propiedad 2 — Invariante de categoría para eventos
    - **Propiedad 2: Invariante de categoría para eventos**
    - Generar publicaciones arbitrarias con `isEvent = true` y categorías distintas de `"championship"` usando `fc.record` y `fc.constantFrom`
    - Verificar que el caso de uso `createPortalPublication` fuerza `isEvent = false` (o lanza error) cuando `category !== "championship"`
    - **Valida: Requisito 8.1**

  - [ ]\* 11.3 Escribir test de propiedad para Propiedad 3 — Unicidad de inscripción (idempotencia)
    - **Propiedad 3: Unicidad de inscripción (idempotencia)**
    - Usar un repositorio en memoria (mock) para simular el estado
    - Generar pares arbitrarios `(publicationId, refereeUserId)` con `fc.uuid`
    - Llamar a `registerForEvent` dos veces con los mismos datos; verificar que la segunda llamada lanza `AlreadyRegisteredForEventError` y que el repositorio contiene exactamente una inscripción
    - **Valida: Requisitos 4.4, 8.3**

  - [ ]\* 11.4 Escribir test de propiedad para Propiedad 4 — Respeto de cupo máximo
    - **Propiedad 4: Respeto de cupo máximo**
    - Generar un evento con `maxParticipants` arbitrario (entre 1 y 100) usando `fc.integer`
    - Simular inscripciones hasta alcanzar el cupo con un repositorio en memoria
    - Verificar que la siguiente llamada a `registerForEvent` lanza `EventAtCapacityError`
    - **Valida: Requisitos 4.5, 8.4**

  - [ ]\* 11.5 Escribir test de propiedad para Propiedad 5 — Autorización de inscripción y ownership
    - **Propiedad 5: Autorización de inscripción y ownership**
    - Generar pares arbitrarios de `refereeUserId` distintos usando `fc.uuid`
    - Verificar que el caso de uso `unregisterFromEvent` lanza `RefereeEventRegistrationNotFoundError` cuando el `refereeUserId` no coincide con el de la inscripción existente
    - **Valida: Requisitos 7.3, 7.4**

  - [ ]\* 11.6 Escribir test de propiedad para Propiedad 6 — Integridad referencial de inscripciones
    - **Propiedad 6: Integridad referencial de inscripciones**
    - Generar publicaciones arbitrarias con `isEvent = false` usando `fc.record`
    - Verificar que el caso de uso `registerForEvent` lanza `NotAnEventError` cuando la publicación tiene `isEvent = false`
    - **Valida: Requisitos 8.5, 8.6**

  - [ ]\* 11.7 Escribir test de propiedad para Propiedad 7 — Validación de tipo MIME en servidor
    - **Propiedad 7: Validación de tipo MIME en servidor**
    - Generar tipos MIME arbitrarios que no sean `image/jpeg`, `image/png` ni `image/webp` usando `fc.string` con filtro
    - Verificar que la lógica de validación del Server Action rechaza el archivo y retorna `{ success: false, code: "VALIDATION_ERROR" }` sin llamar al Storage
    - **Valida: Requisitos 1.5, 7.6**

  - [ ]\* 11.8 Escribir test de propiedad para Propiedad 8 — Atomicidad de creación con imagen
    - **Propiedad 8: Atomicidad de creación con imagen**
    - Usar un mock del Storage que siempre falla
    - Generar inputs válidos de publicación con imagen usando `fc.record`
    - Verificar que cuando el upload falla, el repositorio de publicaciones no recibe ninguna llamada a `save` y la acción retorna `{ success: false, code: "STORAGE_ERROR" }`
    - **Valida: Requisito 1.6**

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para una entrega MVP más rápida
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los puntos de control garantizan validación incremental antes de avanzar a la siguiente capa
- Los tests de propiedades validan las garantías de corrección universales definidas en el diseño
- Los tests unitarios validan ejemplos específicos y casos borde
- El bucket `referee-portal-images` debe crearse manualmente en Supabase Storage (o mediante script) con `allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]` y `fileSizeLimit: 5242880` antes de ejecutar las tareas de la capa de infraestructura

# Plan de Implementación: Sistema de Inscripción a Eventos

## Descripción general

Extender el módulo de eventos marciales existente con capacidades de inscripción de participantes. Se añaden campos de descripción, precio (CLP) y aforo a `martial_events`, se crea la tabla `event_registrations` con flujo de confirmación diferenciado (gratuito/pago), y se implementan las páginas de gestión para Admin e Instructor.

## Tareas

- [x] 1. Migración de base de datos
  - [x] 1.1 Crear `src/lib/db/migrations/030_event_registration_system.sql` con la extensión de `martial_events` (campos `description`, `registration_fee`, `min_participants`, `max_participants` con sus constraints) y la nueva tabla `event_registrations` con índices en `event_id`, `practitioner_id` e `instructor_id`
    - _Requirements: 1.1, 2.1, 3.1, 5.5_

- [x] 2. Capa de dominio — entidades e interfaces
  - [x] 2.1 Crear `src/modules/event-registration/domain/entities/eventRegistration.ts` con los tipos `EventRegistration`, `RegistrationStatus` y las funciones puras `determineInitialStatus`, `formatRegistrationFee` y `hasCapacity`
    - _Requirements: 2.7, 3.5, 3.6, 5.1, 5.2_
  - [x] 2.2 Escribir property tests para `determineInitialStatus`, `formatRegistrationFee` y `hasCapacity` con fast-check
    - **Property 5: Fee display formatting** — `formatRegistrationFee` retorna "Entrada libre" si y solo si el fee es null o 0
    - **Validates: Requirements 2.7**
    - **Property 9: Capacity display invariant** — `hasCapacity` retorna false si y solo si confirmedCount >= maxParticipants
    - **Validates: Requirements 3.6**
    - **Property 14: Initial status based on event type** — `determineInitialStatus` retorna 'confirmada' si y solo si fee es null o 0
    - **Validates: Requirements 5.1, 5.2**
  - [x] 2.3 Crear `src/modules/event-registration/domain/errors.ts` con las clases `EventAtCapacityError`, `AlreadyRegisteredError`, `RegistrationAlreadyConfirmedError` y `RegistrationNotFoundError`
    - _Requirements: 3.5, 4.4, 4.5, 5.4_
  - [x] 2.4 Crear `src/modules/event-registration/domain/interfaces/eventRegistrationRepository.ts` con la interfaz `IEventRegistrationRepository` (findById, findByEvent, findByPractitionerAndEvent, countConfirmedByEvent, countByEventGroupedByStatus, save, update) y los tipos auxiliares `RegistrationWithDetails`, `StatusCounts`, `RegistrationFilters`
    - _Requirements: 4.3, 5.5, 6.2, 6.3_

- [x] 3. Capa de infraestructura — repositorio Drizzle
  - [x] 3.1 Crear `src/modules/event-registration/infrastructure/repositories/drizzleEventRegistrationRepository.ts` implementando `IEventRegistrationRepository` con `adminSupabase`; `findByEvent` hace JOIN con `practitioners` para obtener nombres; `countConfirmedByEvent` filtra por `status = 'confirmada'`; `countByEventGroupedByStatus` agrupa por status
    - _Requirements: 4.3, 5.3, 5.5, 6.2, 6.3_
  - [x] 3.2 Escribir property tests para el repositorio
    - **Property 18: Status counts sum to total** — la suma de (pendiente_pago + confirmada + cancelada) de `countByEventGroupedByStatus` es igual al total de inscripciones del evento
    - **Validates: Requirements 6.3**
    - **Property 13: No duplicate registrations** — inscribir un alumno ya registrado no crea un segundo registro; el conteo para ese par (event_id, practitioner_id) permanece en 1
    - **Validates: Requirements 4.4**

- [x] 4. Capa de aplicación — use cases
  - [x] 4.1 Crear `src/modules/event-registration/application/use-cases/enrollStudents.ts`: verifica aforo con `countConfirmedByEvent` y `hasCapacity` (lanza `EventAtCapacityError`), omite alumnos ya inscritos (lanza `AlreadyRegisteredError` por cada uno), determina status inicial con `determineInitialStatus`, persiste un registro por alumno; retorna `{ enrolled: string[]; skipped: { id: string; name: string }[] }`
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 5.1, 5.2_
  - [x] 4.2 Escribir property tests para `enrollStudents`
    - **Property 8: Capacity enforcement** — con exactamente N inscripciones confirmadas y max_participants = N, cualquier intento de inscribir un alumno adicional falla con EventAtCapacityError sin modificar el conteo
    - **Validates: Requirements 3.5, 4.5**
    - **Property 12: Registration creation round-trip** — tras inscribir un alumno, la consulta por (event_id, practitioner_id) retorna un registro con todos los campos requeridos (status, registered_at, confirmed_at, confirmed_by)
    - **Validates: Requirements 4.3, 5.5**
  - [x] 4.3 Crear `src/modules/event-registration/application/use-cases/confirmPayment.ts`: verifica que la inscripción exista (lanza `RegistrationNotFoundError`), verifica que el status sea 'pendiente_pago' (lanza `RegistrationAlreadyConfirmedError` si ya está confirmada), actualiza status a 'confirmada', registra `confirmed_at` y `confirmed_by`
    - _Requirements: 5.3, 5.4_
  - [x] 4.4 Escribir property tests para `confirmPayment`
    - **Property 15: Payment confirmation transition** — tras confirmar pago de una inscripción 'pendiente_pago', el status es 'confirmada' y confirmed_at es no nulo
    - **Validates: Requirements 5.3**
    - **Property 16: Double-confirm guard** — confirmar una inscripción ya 'confirmada' lanza RegistrationAlreadyConfirmedError y no modifica el status
    - **Validates: Requirements 5.4**
    - **Property 19: Error atomicity on confirmation failure** — si confirmPayment lanza un error, el status de la inscripción en el repositorio permanece igual al valor previo
    - **Validates: Requirements 6.5**
  - [x] 4.5 Crear `src/modules/event-registration/application/use-cases/cancelRegistration.ts`: verifica que la inscripción exista (lanza `RegistrationNotFoundError`), actualiza status a 'cancelada', registra `cancelled_at` y `cancelled_by`
    - _Requirements: 5.6_
  - [x] 4.6 Escribir property test para `cancelRegistration`
    - **Property 17: Cancellation transition** — tras cancelar una inscripción 'pendiente_pago' o 'confirmada', el status es 'cancelada' y cancelled_at es no nulo
    - \*\*Validates: Requirements 5.6\_

- [x] 5. Checkpoint — Asegurar que todos los tests pasen
  - Ejecutar la suite de tests; resolver cualquier fallo antes de continuar con la capa de presentación.

- [x] 6. Server Actions — Inscripción (Instructor)
  - [x] 6.1 Crear `src/modules/event-registration/presentation/actions/enrollStudentsAction.ts` con schema Zod (eventId, practitionerIds[]) y la action `enrollStudentsAction`: verifica que el instructor autenticado sea el propietario de los alumnos, llama `enrollStudents`, llama `revalidatePath`; retorna `ActionResult<{ enrolled: string[]; skipped: { id: string; name: string }[] }>`
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 7. Server Actions — Gestión de inscripciones (Admin)
  - [x] 7.1 Crear `src/modules/event-registration/presentation/actions/registrationActions.ts` con schemas Zod y las actions: `confirmPaymentAction` (requiere admin, llama `confirmPayment`, revalida path), `cancelRegistrationAction` (requiere admin, llama `cancelRegistration`, revalida path); cada action mapea errores de dominio a mensajes en español y retorna `ActionResult`
    - _Requirements: 5.3, 5.4, 5.6, 6.4, 6.5_

- [x] 8. Extensión del formulario de eventos (Admin)
  - [x] 8.1 Actualizar `src/app/(dashboard)/admin/events/EventForm.tsx` para añadir los campos: textarea "Descripción" (opcional, max 5000 chars), campo numérico "Precio de inscripción" con casilla "Entrada libre" (deshabilita el campo cuando está marcada), campos numéricos "Mínimo de participantes" y "Máximo de participantes"; añadir validaciones Zod correspondientes
    - _Requirements: 1.2, 1.3, 1.4, 1.6, 2.2, 2.3, 2.4, 2.5, 2.6, 3.2, 3.3, 3.4_
  - [x] 8.2 Escribir property tests para el schema Zod del formulario de eventos
    - **Property 2: Description length validation** — cualquier string mayor a 5000 caracteres es rechazado por el schema
    - **Validates: Requirements 1.6**
    - **Property 4: Fee validation rejects invalid values** — cualquier número negativo o string no numérico como registration_fee es rechazado
    - **Validates: Requirements 2.5, 2.6**
    - **Property 7: Participant limits validation** — cualquier par donde max < min, o cualquier valor < 1, es rechazado
    - **Validates: Requirements 3.3, 3.4**

- [x] 9. Extensión de la página de detalle de evento (Admin)
  - [x] 9.1 Actualizar `src/app/(dashboard)/admin/events/[eventId]/page.tsx` para mostrar: campo `description` cuando no es nulo, precio formateado con `formatRegistrationFee`, indicador de aforo "X / Y inscritos" cuando `max_participants` está definido, enlace "Gestionar inscripciones" que apunta a `/admin/events/[eventId]/registrations`
    - _Requirements: 1.5, 2.7, 3.6_
  - [x] 9.2 Escribir property tests para el formateo de datos del evento
    - **Property 1: Description round-trip** — guardar un evento con descripción de hasta 5000 chars y recuperarlo retorna exactamente la misma cadena
    - **Validates: Requirements 1.1, 1.3**
    - **Property 3: Registration fee round-trip** — guardar un evento con fee no negativo (incluyendo null) y recuperarlo retorna el mismo valor
    - **Validates: Requirements 2.1, 2.4**
    - **Property 6: Participant limits round-trip** — guardar un evento con (min, max) válidos y recuperarlo retorna los mismos valores
    - **Validates: Requirements 3.1**

- [x] 10. Panel de inscripciones (Admin)
  - [x] 10.1 Crear `src/app/(dashboard)/admin/events/[eventId]/registrations/page.tsx`: tabla con columnas nombre del alumno, nombre del instructor, estado de la inscripción y fecha de inscripción; cabecera con recuento por estado (pendiente_pago / confirmada / cancelada) e indicador de aforo cuando aplica; enlace de retorno al detalle del evento
    - _Requirements: 6.1, 6.2, 6.3, 6.6, 6.7_
  - [x] 10.2 Crear `src/app/(dashboard)/admin/events/[eventId]/registrations/ConfirmPaymentButton.tsx`: botón "Confirmar pago" que llama `confirmPaymentAction` y actualiza la vista sin recargar la página completa; muestra mensaje de error descriptivo si la acción falla
    - _Requirements: 6.4, 6.5_
  - [x] 10.3 Crear `src/app/(dashboard)/admin/events/[eventId]/registrations/CancelRegistrationButton.tsx`: botón "Cancelar inscripción" con confirmación que llama `cancelRegistrationAction` y actualiza la vista
    - _Requirements: 5.6_

- [x] 11. Sección de eventos para Instructor
  - [x] 11.1 Crear `src/app/(dashboard)/instructor/events/page.tsx`: lista los eventos con fecha futura; columnas nombre, tipo, fecha, precio, aforo disponible; enlace "Inscribir alumnos" por evento
    - _Requirements: 4.1_
  - [x] 11.2 Escribir property test para el filtro de eventos futuros
    - **Property 10: Future events filter** — todos los eventos retornados por la query del instructor tienen event_date estrictamente mayor que la fecha actual
    - **Validates: Requirements 4.1**
  - [x] 11.3 Crear `src/app/(dashboard)/instructor/events/[eventId]/enroll/page.tsx`: muestra el detalle del evento (nombre, fecha, precio, aforo); lista de checkboxes con los alumnos del instructor; mensaje "No tienes alumnos asignados para inscribir" cuando la lista está vacía; botón "Inscribir seleccionados" que llama `enrollStudentsAction`; muestra resumen de alumnos inscritos y omitidos tras la operación; muestra el estado de las inscripciones realizadas (confirmadas o pendientes de pago) para que el instructor pueda ver el resultado de sus inscripciones
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2_
  - [x] 11.4 Escribir property test para aislamiento de alumnos por instructor
    - **Property 11: Instructor student isolation** — la lista de alumnos disponibles para inscripción contiene únicamente practicantes cuyo instructor_id coincide con el id del instructor autenticado
    - **Validates: Requirements 4.2**

- [x] 12. Checkpoint final — Asegurar que todos los tests pasen
  - Ejecutar la suite completa de tests; verificar que las páginas renderizan correctamente; resolver cualquier fallo antes de dar por completada la implementación.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Cada tarea referencia los requisitos específicos para trazabilidad.
- Los property tests usan fast-check y validan las propiedades de corrección definidas en el diseño.
- El módulo nuevo se llama `event-registration` y convive con el módulo `practitioner-identity` existente.
- La acción `enrollStudentsAction` verifica que los alumnos pertenezcan al instructor autenticado antes de llamar al use case.
- El campo `registration_fee` se almacena en CLP; el formateo usa `Intl.NumberFormat` con locale `es-CL`.

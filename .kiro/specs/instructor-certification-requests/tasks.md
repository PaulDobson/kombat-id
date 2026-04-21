# Tasks: Instructor Certification Requests

## Task List

- [x] 1. Migración de base de datos
  - [x] 1.1 Crear `src/lib/db/migrations/028_add_observed_status.sql` con ALTER TABLE para ampliar el CHECK constraint a `('pending','approved','rejected','observed')` y agregar columna `observation_notes TEXT`

- [x] 2. Action para "observar" solicitud (admin)
  - [x] 2.1 Agregar `ObserveCertificationRequestInputSchema` en `instructorActions.ts` con campos `requestId` (uuid) y `observationNotes` (string min 1)
  - [x] 2.2 Implementar `observeCertificationRequestAction` en `instructorActions.ts`: requiere admin, valida input, actualiza `status='observed'` y `observation_notes`, llama `revalidatePath`

- [x] 3. Sección "Mis solicitudes" en el panel del instructor
  - [x] 3.1 Agregar parámetro `reqPage` al `searchParams` de `InstructorPage` y query paginada de `certification_requests` filtrada por `requester_id = practitioner.id` con join a `practitioners` para nombre del alumno
  - [x] 3.2 Agregar helper `getStatusBadge(status)` que retorna `{ label, className }` para los 4 estados
  - [x] 3.3 Renderizar la sección "Mis solicitudes" en `page.tsx`: tabla con columnas Alumno, Tipo, Fecha, Estado; mostrar motivo (`rejection_reason` o `observation_notes`) cuando aplique; estado vacío; paginación con `reqPage`

- [x] 4. Botón "Observar" en el panel de admin
  - [x] 4.1 Crear `src/app/(dashboard)/admin/certification-requests/ObserveRequestButton.tsx` con modal/inline form para ingresar `observationNotes` y llamar `observeCertificationRequestAction`
  - [x] 4.2 Agregar `ObserveRequestButton` a la tabla en `/admin/certification-requests/page.tsx` junto a los botones Aprobar y Rechazar existentes

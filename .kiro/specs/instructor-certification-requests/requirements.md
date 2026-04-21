# Requirements: Instructor Certification Requests

## Introduction

Esta feature permite al instructor revisar el estado de todas sus solicitudes de certificación desde su panel en `/instructor`. Incluye la migración de base de datos para soportar el estado "observada" y la visualización del motivo cuando aplique.

## Requirements

### Requirement 1: Sección "Mis solicitudes" en el panel del instructor

**User Story:** Como instructor, quiero ver todas mis solicitudes de certificación en mi panel, para poder hacer seguimiento de su estado sin contactar al administrador.

#### Acceptance Criteria

1. WHEN el instructor accede a `/instructor` THEN la página muestra una sección "Mis solicitudes" con la lista de todas las solicitudes enviadas por ese instructor, ordenadas por fecha descendente.
2. WHEN no hay solicitudes THEN la sección muestra el mensaje "Aún no has enviado solicitudes de certificación."
3. WHEN hay más de 10 solicitudes THEN la sección muestra paginación con parámetro `reqPage` en la URL, sin interferir con la paginación de alumnos (`page`).
4. WHEN se carga la página THEN cada fila muestra: nombre del alumno, tipo de certificación, fecha de solicitud y badge de estado.

---

### Requirement 2: Badge visual por estado

**User Story:** Como instructor, quiero identificar visualmente el estado de cada solicitud de un vistazo, para priorizar mi atención.

#### Acceptance Criteria

1. WHEN el estado es `pending` THEN el badge muestra "Pendiente" con estilo amarillo (`bg-yellow-900/50 text-yellow-400 border-yellow-800`).
2. WHEN el estado es `approved` THEN el badge muestra "Aprobada" con estilo verde (`bg-emerald-900/50 text-emerald-400 border-emerald-800`).
3. WHEN el estado es `rejected` THEN el badge muestra "Rechazada" con estilo rojo (`bg-red-900/50 text-red-400 border-red-800`).
4. WHEN el estado es `observed` THEN el badge muestra "Observada" con estilo azul (`bg-blue-900/50 text-blue-400 border-blue-800`).

---

### Requirement 3: Visualización del motivo

**User Story:** Como instructor, quiero leer el motivo cuando una solicitud es rechazada u observada, para entender qué debo corregir o complementar.

#### Acceptance Criteria

1. WHEN el estado es `rejected` AND `rejection_reason` no es null THEN la fila muestra el campo `rejection_reason` debajo del badge o en una columna dedicada.
2. WHEN el estado es `observed` AND `observation_notes` no es null THEN la fila muestra el campo `observation_notes` debajo del badge o en una columna dedicada.
3. WHEN el estado es `pending` o `approved` THEN no se muestra ningún campo de motivo.
4. WHEN `rejection_reason` o `observation_notes` es null para un estado que los requiere THEN no se muestra el campo (sin error).

---

### Requirement 4: Migración de base de datos

**User Story:** Como desarrollador, necesito que la tabla `certification_requests` soporte el estado "observed" y almacene notas de observación, para que el admin pueda marcar solicitudes que requieren corrección.

#### Acceptance Criteria

1. WHEN se ejecuta la migración `028_add_observed_status.sql` THEN el CHECK constraint de la columna `status` acepta los valores: `pending`, `approved`, `rejected`, `observed`.
2. WHEN se ejecuta la migración THEN la tabla tiene una columna `observation_notes TEXT` nullable.
3. WHEN se intenta insertar un status no válido (ej. `"cancelled"`) THEN la DB rechaza la operación con error de constraint.

---

### Requirement 5: Action para marcar solicitud como "observada" (admin)

**User Story:** Como administrador, quiero poder marcar una solicitud como "observada" con un mensaje explicativo, para comunicarle al instructor qué debe corregir sin rechazar definitivamente la solicitud.

#### Acceptance Criteria

1. WHEN un admin llama a `observeCertificationRequestAction` con `requestId` y `observationNotes` válidos THEN el status de la solicitud cambia a `observed` y `observation_notes` se guarda en DB.
2. WHEN el usuario no es admin THEN la action retorna `{ success: false, code: "UNAUTHORIZED" }`.
3. WHEN `observationNotes` está vacío THEN la action retorna `{ success: false, code: "VALIDATION_ERROR" }`.
4. WHEN la action tiene éxito THEN se llama `revalidatePath("/admin/certification-requests")`.

---

### Requirement 6: Seguridad y aislamiento de datos

**User Story:** Como instructor, quiero tener la certeza de que solo veo mis propias solicitudes, para proteger la privacidad de otros instructores.

#### Acceptance Criteria

1. WHEN se consultan las solicitudes THEN la query siempre filtra por `requester_id = practitioner.id` del usuario autenticado.
2. WHEN un instructor intenta acceder a solicitudes de otro instructor (manipulando `reqPage`) THEN solo ve sus propias solicitudes (el filtro es server-side).
3. WHEN el usuario no tiene perfil de practitioner activo con rol instructor THEN es redirigido a `/dashboard` (comportamiento existente preservado).

# Documento de Requisitos: Registro de Árbitros Oficiales

## Introducción

Esta funcionalidad incorpora un registro de árbitros oficiales al ecosistema de Kombat Taekwondo Chile. Un árbitro es una persona acreditada para arbitrar en eventos de combate, cuya identidad y habilitación deben estar verificadas mediante un certificado oficial (PDF) y un número de registro oficial.

El flujo tiene dos actores principales: el árbitro que se auto-registra a través de una página pública dedicada, y el administrador que gestiona (aprueba, edita, lista) los registros desde el panel de administración.

La página principal incorpora un nuevo acceso **Regístrate como árbitro** que deriva al formulario de registro público. El formulario captura email, nombre completo, país, número de registro oficial y el certificado PDF.

El módulo se implementa bajo la arquitectura Clean/Screaming Architecture del proyecto, con un nuevo bounded context `referee-registration` en `src/modules/`. Una vez que el administrador aprueba un registro, el sistema crea automáticamente una cuenta de usuario en Supabase Auth usando el email del árbitro y le envía un enlace para establecer su contraseña. Con esa cuenta, el árbitro accede a un portal privado (`/referee/dashboard`) donde puede consultar noticias sobre seminarios, documentos de reglamento, actualizaciones normativas e información sobre campeonatos. Solo el administrador puede publicar contenido en el portal; los árbitros únicamente pueden leerlo. El acceso al portal está controlado por el rol `referee` asignado en Supabase Auth al momento de la aprobación.

---

## Glosario

- **Árbitro**: Persona acreditada para arbitrar en eventos de combate de Kombat Taekwondo Chile.
- **Registro de árbitro**: Solicitud de acreditación enviada por el árbitro a través del formulario público.
- **Número de registro oficial**: Identificador único asignado por la organización al árbitro acreditado.
- **Certificado PDF**: Documento oficial que acredita la habilitación del árbitro, subido por el propio árbitro.
- **Portal de árbitros**: Área privada (`/referee/dashboard`) accesible solo por árbitros aprobados.
- **Publicación del portal**: Contenido (noticias, documentos, actualizaciones) publicado por el administrador en el portal de árbitros.
- **Rol `referee`**: Rol asignado en Supabase Auth al momento de la aprobación que controla el acceso al portal.
- **Admin_Panel**: Panel de administración en `/admin`.
- **Referee_Registration_System**: Sistema completo de registro y gestión de árbitros.
- **Public_Registration_Form**: Formulario público en `/referee-registration`.
- **Referee_Portal**: Portal privado de árbitros en `/referee/dashboard`.

---

## Requisitos

### Requisito 1: Acceso público al formulario de registro

**Historia de usuario:** Como árbitro acreditado, quiero acceder a un formulario de registro público desde la página principal, para poder solicitar mi incorporación al registro oficial de árbitros de Kombat Taekwondo Chile.

#### Criterios de aceptación

1. THE Public_Registration_Form SHALL be accessible at the route `/referee-registration`.
2. WHEN a visitor navigates to the home page (`/`), THE home page SHALL display a visible link or button labeled "Regístrate como árbitro" that navigates to `/referee-registration`.
3. THE route `/referee-registration` SHALL be publicly accessible without authentication.
4. WHEN the middleware processes a request to `/referee-registration`, THE middleware SHALL allow access without requiring a session.

---

### Requisito 2: Formulario de registro de árbitro

**Historia de usuario:** Como árbitro acreditado, quiero completar un formulario con mis datos personales y subir mi certificado oficial, para que el administrador pueda verificar y aprobar mi registro.

#### Criterios de aceptación

1. THE Public_Registration_Form SHALL include the following fields: email (required), full name (required), country (required), official registration number (required), and PDF certificate (required file upload).
2. WHEN a user submits the form with all required fields valid, THE Referee_Registration_System SHALL create a new referee registration record with status `pending`.
3. WHEN a user submits the form with any required field missing or invalid, THE Public_Registration_Form SHALL display a descriptive validation error for each invalid field and SHALL NOT create a registration record.
4. WHEN a user submits the form with an email that already exists in the referee registrations table, THE Referee_Registration_System SHALL reject the submission and display an error indicating the email is already registered.
5. WHEN a user uploads a PDF certificate, THE Referee_Registration_System SHALL store the file in Supabase Storage under the path `referee-certificates/{registrationId}/{filename}` and SHALL record the storage path in the registration record.
6. WHEN a user uploads a file that is not a PDF, THE Public_Registration_Form SHALL reject the file and display an error indicating only PDF files are accepted.
7. WHEN a user uploads a PDF file larger than 10 MB, THE Public_Registration_Form SHALL reject the file and display an error indicating the maximum file size.
8. WHEN a registration is successfully submitted, THE Public_Registration_Form SHALL display a confirmation message indicating the submission is under review.

---

### Requisito 3: Listado de registros en el panel de administración

**Historia de usuario:** Como administrador, quiero ver todos los registros de árbitros con su estado actual, para poder gestionar las solicitudes pendientes y el historial de árbitros aprobados o rechazados.

#### Criterios de aceptación

1. THE Admin_Panel SHALL provide a page at `/admin/referee-registrations` that lists all referee registration records.
2. WHEN the admin accesses `/admin/referee-registrations`, THE Admin_Panel SHALL display for each record: full name, email, country, official registration number, status, and submission date.
3. THE Admin_Panel SHALL support filtering the list by status (`pending`, `approved`, `rejected`).
4. WHEN no registrations match the active filter, THE Admin_Panel SHALL display an empty state message.
5. THE Admin_Panel SHALL paginate the list when there are more than 25 records.

---

### Requisito 4: Aprobación de un registro de árbitro

**Historia de usuario:** Como administrador, quiero aprobar un registro de árbitro pendiente, para que el árbitro reciba acceso al portal privado y quede oficialmente registrado.

#### Criterios de aceptación

1. WHEN an admin approves a pending referee registration, THE Referee_Registration_System SHALL update the registration status to `approved` and record the approval timestamp and the admin's user ID.
2. WHEN a registration is approved, THE Referee_Registration_System SHALL create a Supabase Auth user using the referee's email via the admin client (`adminSupabase.auth.admin.createUser`).
3. WHEN the Supabase Auth user is created, THE Referee_Registration_System SHALL assign the role `referee` in the user's `app_metadata` and SHALL link the `auth_user_id` in the registration record.
4. WHEN the auth user is created and the role is assigned, THE Referee_Registration_System SHALL send a password setup invitation email using `adminSupabase.auth.admin.inviteUserByEmail` so the referee can set their password.
5. IF the Supabase Auth user creation fails, THEN THE Referee_Registration_System SHALL NOT update the registration status and SHALL return an error to the admin.
6. IF a registration is already in `approved` or `rejected` status, THEN THE Admin_Panel SHALL NOT allow re-approval and SHALL display an appropriate message.

---

### Requisito 5: Rechazo de un registro de árbitro

**Historia de usuario:** Como administrador, quiero rechazar un registro de árbitro que no cumpla los requisitos, para mantener la integridad del registro oficial.

#### Criterios de aceptación

1. WHEN an admin rejects a pending referee registration, THE Referee_Registration_System SHALL update the registration status to `rejected` and record the rejection timestamp and the admin's user ID.
2. IF a registration is already in `approved` or `rejected` status, THEN THE Admin_Panel SHALL NOT allow rejection and SHALL display an appropriate message.

---

### Requisito 6: Edición de un registro de árbitro

**Historia de usuario:** Como administrador, quiero editar los datos de un registro de árbitro, para corregir errores o actualizar información antes o después de la aprobación.

#### Criterios de aceptación

1. THE Admin_Panel SHALL provide an edit form for each referee registration accessible from the list page.
2. WHEN an admin submits the edit form with valid data, THE Referee_Registration_System SHALL update the registration record and record the update timestamp.
3. WHEN an admin submits the edit form with invalid data, THE Admin_Panel SHALL display validation errors and SHALL NOT update the record.
4. THE edit form SHALL allow updating: full name, country, and official registration number. Email SHALL NOT be editable after submission.

---

### Requisito 7: Acceso al portal privado de árbitros

**Historia de usuario:** Como árbitro aprobado, quiero acceder a un portal privado con información relevante para mi actividad como árbitro, para mantenerme actualizado sobre reglamentos, seminarios y campeonatos.

#### Criterios de aceptación

1. THE Referee_Portal SHALL be accessible at the route `/referee/dashboard`.
2. WHEN an unauthenticated user navigates to `/referee/dashboard`, THE middleware SHALL redirect the user to `/login`.
3. WHEN an authenticated user without the `referee` role navigates to `/referee/dashboard`, THE Referee_Portal SHALL redirect the user to `/dashboard`.
4. WHEN an authenticated user with the `referee` role accesses `/referee/dashboard`, THE Referee_Portal SHALL display the portal content.
5. THE Referee_Portal SHALL display a list of publications ordered by publication date descending.
6. WHEN there are no publications, THE Referee_Portal SHALL display an empty state message.

---

### Requisito 8: Publicaciones en el portal de árbitros

**Historia de usuario:** Como administrador, quiero publicar contenido (noticias, documentos, actualizaciones normativas) en el portal de árbitros, para mantener informados a los árbitros acreditados.

#### Criterios de aceptación

1. THE Admin_Panel SHALL provide a page to create new publications for the referee portal.
2. WHEN an admin creates a publication, THE Referee_Registration_System SHALL store the publication with: title (required), body (required), category (`news` | `regulation` | `championship`), and publication timestamp.
3. WHEN an admin submits the publication form with missing required fields, THE Admin_Panel SHALL display validation errors and SHALL NOT create the publication.
4. THE Admin_Panel SHALL allow editing and deleting existing publications.
5. WHEN a publication is deleted, THE Referee_Registration_System SHALL remove it from the portal immediately.

---

### Requisito 9: Visualización del certificado PDF

**Historia de usuario:** Como administrador, quiero poder visualizar el certificado PDF subido por el árbitro, para verificar su autenticidad antes de aprobar el registro.

#### Criterios de aceptación

1. THE Admin_Panel SHALL display a link or button to view the PDF certificate for each referee registration.
2. WHEN an admin clicks the view certificate link, THE Referee_Registration_System SHALL generate a signed URL from Supabase Storage and open the PDF in a new browser tab.
3. THE signed URL SHALL have an expiration of no more than 1 hour.

---

### Requisito 10: Seguridad y control de acceso

**Historia de usuario:** Como administrador del sistema, quiero que todas las operaciones de gestión de árbitros estén protegidas por autenticación y autorización, para garantizar la integridad del registro.

#### Criterios de aceptación

1. WHEN any Server Action in the Referee_Registration_System is invoked, THE Server Action SHALL verify that the caller is an authenticated admin user before executing any logic.
2. WHEN a non-admin authenticated user attempts to access `/admin/referee-registrations`, THE Admin_Panel SHALL redirect the user to `/dashboard`.
3. THE Referee_Portal SHALL only display content to users whose Supabase Auth `app_metadata.role` equals `referee`.
4. WHEN the Referee_Registration_System stores a PDF certificate, THE system SHALL use a private Supabase Storage bucket that does not allow public access.
5. WHEN generating a signed URL for a PDF certificate, THE Referee_Registration_System SHALL only allow admin users to request signed URLs.

---

### Requisito 11: Arquitectura y estructura del módulo

**Historia de usuario:** Como desarrollador, quiero que el módulo de registro de árbitros siga la arquitectura Clean/Screaming Architecture del proyecto, para mantener la coherencia y mantenibilidad del código.

#### Criterios de aceptación

1. THE Referee_Registration_System SHALL be implemented as a new bounded context at `src/modules/referee-registration/` with the sub-layers: `domain/`, `application/`, `infrastructure/`, and `presentation/`.
2. THE domain layer SHALL contain entity types and repository interfaces with zero imports from Next.js, Drizzle, Supabase, or any framework.
3. THE application layer SHALL contain one use case file per operation, accepting dependencies through function parameters.
4. THE infrastructure layer SHALL contain Drizzle/Supabase repository implementations and SHALL be the only layer that imports `adminSupabase`.
5. THE presentation layer SHALL contain Server Actions (in `actions/`) and React components (in `components/`), with Server Actions acting as the composition root.

---

### Requisito 12: Modelo de datos

**Historia de usuario:** Como desarrollador, quiero que el modelo de datos del módulo esté bien definido y sea consistente con el esquema existente del proyecto, para facilitar la implementación y las migraciones.

#### Criterios de aceptación

1. THE Referee_Registration_System SHALL use a `referee_registrations` table with columns: `id` (UUID PK), `email` (text, unique), `full_name` (text), `country` (text), `registration_number` (text), `certificate_path` (text), `status` (enum: `pending` | `approved` | `rejected`), `auth_user_id` (UUID, nullable), `approved_at` (timestamptz, nullable), `approved_by` (UUID, nullable), `rejected_at` (timestamptz, nullable), `rejected_by` (UUID, nullable), `created_at` (timestamptz), `updated_at` (timestamptz).
2. THE Referee_Registration_System SHALL use a `referee_portal_publications` table with columns: `id` (UUID PK), `title` (text), `body` (text), `category` (enum: `news` | `regulation` | `championship`), `published_at` (timestamptz), `created_by` (UUID), `created_at` (timestamptz), `updated_at` (timestamptz).
3. THE `referee_registrations` table SHALL enforce a unique constraint on the `email` column.
4. THE `referee_registrations` table SHALL enforce a unique constraint on the `registration_number` column.

---

### Requisito 13: Integración con la navegación pública

**Historia de usuario:** Como visitante de la página principal, quiero ver claramente la opción de registrarme como árbitro, para poder acceder fácilmente al formulario de registro.

#### Criterios de aceptación

1. WHEN the home page (`/`) renders, THE home page SHALL include a visible call-to-action linking to `/referee-registration` with the text "Regístrate como árbitro".
2. THE PublicNav component SHALL include a navigation link to `/referee-registration` visible in the header.

---

### Requisito 14: Manejo de errores y estados de carga

**Historia de usuario:** Como usuario del sistema, quiero recibir retroalimentación clara sobre el estado de las operaciones, para saber si mis acciones fueron exitosas o si ocurrió algún error.

#### Criterios de aceptación

1. WHEN a Server Action in the Referee_Registration_System succeeds, THE Server Action SHALL return `{ success: true; data: T }`.
2. WHEN a Server Action in the Referee_Registration_System fails due to validation, THE Server Action SHALL return `{ success: false; error: string; code: "VALIDATION_ERROR" }`.
3. WHEN a Server Action in the Referee_Registration_System fails due to a conflict (duplicate email or registration number), THE Server Action SHALL return `{ success: false; error: string; code: "CONFLICT" }`.
4. WHEN a Server Action in the Referee_Registration_System fails due to an unexpected error, THE Server Action SHALL log the error server-side and return `{ success: false; error: "An unexpected error occurred"; code: "INTERNAL_ERROR" }`.
5. WHEN a PDF upload fails, THE Public_Registration_Form SHALL display a user-friendly error message and SHALL allow the user to retry the upload.

---

## Propiedades de corrección

_Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema._

### Propiedad 1: Unicidad de email en registros

_Para cualquier_ conjunto de registros de árbitros en la base de datos, no pueden existir dos registros con el mismo email.

**Valida: Requisito 12.3**

---

### Propiedad 2: Unicidad de número de registro oficial

_Para cualquier_ conjunto de registros de árbitros en la base de datos, no pueden existir dos registros con el mismo número de registro oficial.

**Valida: Requisito 12.4**

---

### Propiedad 3: Transición de estado válida

_Para cualquier_ registro de árbitro, el estado solo puede transicionar de `pending` a `approved` o de `pending` a `rejected`. Un registro en estado `approved` o `rejected` no puede cambiar de estado.

**Valida: Requisitos 4.6, 5.2**

---

### Propiedad 4: Consistencia aprobación–cuenta Auth

_Para cualquier_ registro de árbitro en estado `approved`, debe existir un `auth_user_id` no nulo que corresponda a un usuario en Supabase Auth con `app_metadata.role === "referee"`.

**Valida: Requisitos 4.2, 4.3**

---

### Propiedad 5: Ruta del certificado PDF

_Para cualquier_ registro de árbitro con `certificate_path` no nulo, la ruta debe seguir el patrón `referee-certificates/{registrationId}/{filename}` y el archivo debe existir en el bucket privado de Supabase Storage.

**Valida: Requisito 2.5**

---

### Propiedad 6: Acceso al portal solo con rol referee

_Para cualquier_ solicitud HTTP a `/referee/dashboard`, si el usuario autenticado no tiene `app_metadata.role === "referee"`, el sistema debe redirigir al usuario fuera del portal.

**Valida: Requisito 7.3**

---

### Propiedad 7: Validación de campos obligatorios del formulario

_Para cualquier_ envío del formulario de registro público, si algún campo obligatorio (email, nombre completo, país, número de registro, certificado PDF) está ausente o inválido, el sistema no debe crear ningún registro en la base de datos.

**Valida: Requisito 2.3**

---

### Propiedad 8: Solo PDFs aceptados

_Para cualquier_ archivo subido en el formulario de registro, si el tipo MIME no es `application/pdf`, el sistema debe rechazar el archivo y no almacenarlo en Supabase Storage.

**Valida: Requisito 2.6**

---

### Propiedad 9: Tamaño máximo del certificado

_Para cualquier_ archivo PDF subido en el formulario de registro, si el tamaño supera los 10 MB, el sistema debe rechazar el archivo y no almacenarlo en Supabase Storage.

**Valida: Requisito 2.7**

---

### Propiedad 10: Autorización en Server Actions

_Para cualquier_ Server Action del módulo que modifica datos (aprobar, rechazar, editar, publicar), si el usuario invocante no es un administrador autenticado, la acción debe retornar un error de autorización sin ejecutar ninguna mutación.

**Valida: Requisito 10.1**

---

### Propiedad 11: Round-trip de serialización de registros

_Para cualquier_ registro de árbitro válido, serializar la entidad a fila de base de datos y luego deserializar la fila a entidad debe producir un objeto equivalente al original.

**Valida: Requisito 11.3**

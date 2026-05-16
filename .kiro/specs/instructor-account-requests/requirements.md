# Documento de Requisitos: Instructor Account Requests

## Introducción

Este documento define los requisitos funcionales y de calidad para el módulo **Instructor Account Requests** de Kombat ID. La funcionalidad permite que un instructor solicite la creación de su cuenta a través de un formulario público sin autenticación. Las solicitudes quedan en estado `pending` hasta que un administrador las aprueba, rechaza u observa (deja una nota). Al aprobar, el sistema crea automáticamente un usuario en Supabase Auth con el rol `instructor` en `app_metadata` y le envía un email de invitación para que establezca su contraseña.

El módulo sigue el patrón Clean Architecture + Screaming Architecture bajo `src/modules/instructor-account-requests/`, con una página pública en `/instructor-registration` y una página de administración en `/admin/instructor-requests`.

---

## Glosario

- **Instructor_Request_Form**: Componente cliente público que permite a un instructor enviar una solicitud de cuenta.
- **Instructor_Account_Request**: Entidad de dominio que representa una solicitud de cuenta de instructor con sus datos y estado.
- **Request_Repository**: Interfaz de repositorio que abstrae el acceso a datos de las solicitudes (`InstructorAccountRequestRepository`).
- **Submit_Use_Case**: Caso de uso `submitInstructorAccountRequest` que crea una nueva solicitud en estado `pending`.
- **Approve_Use_Case**: Caso de uso `approveInstructorAccountRequest` que aprueba una solicitud y crea el usuario Auth.
- **Reject_Use_Case**: Caso de uso `rejectInstructorAccountRequest` que rechaza una solicitud.
- **Observe_Use_Case**: Caso de uso `observeInstructorAccountRequest` que deja una nota y cambia el estado a `observed`.
- **List_Use_Case**: Caso de uso `listInstructorAccountRequests` que lista solicitudes con filtros y paginación.
- **Auth_Service**: Interfaz `InstructorAuthService` que abstrae la creación de usuarios en Supabase Auth.
- **Admin_Action**: Server Action que requiere sesión de administrador para ejecutarse.
- **Status_Validator**: Función de dominio pura `isValidStatusTransition` que valida transiciones de estado.
- **Request_Validator**: Schema Zod que valida los datos de entrada de una solicitud.
- **Admin_Dashboard**: Página de administración en `/admin/instructor-requests`.
- **Public_Page**: Página pública en `/instructor-registration`.
- **Action_Result**: Tipo de retorno estructurado `{ success: true; data: T } | { success: false; error: string; code: string }`.

---

## Requisitos

### Requisito 1: Formulario público de solicitud de cuenta

**User Story:** Como instructor, quiero enviar una solicitud de cuenta a través de un formulario público, para que un administrador pueda revisar mis datos y crear mi cuenta en Kombat ID.

#### Criterios de Aceptación

1. THE Public_Page SHALL renderizar el Instructor_Request_Form sin requerir autenticación del usuario.
2. WHEN un instructor completa el formulario con datos válidos y lo envía, THE Submit_Use_Case SHALL crear una nueva Instructor_Account_Request con estado `pending` y retornar su identificador único (UUID no vacío).
3. WHEN el formulario es enviado exitosamente, THE Instructor_Request_Form SHALL mostrar un mensaje de confirmación visible inline que persiste hasta el siguiente intento de envío, y limpiar todos los campos del formulario.
4. WHEN el instructor intenta enviar el formulario, THE Instructor_Request_Form SHALL validar los datos en el cliente con Zod antes de llamar al Server Action.
5. WHEN el Server Action recibe los datos del formulario, THE Submit_Use_Case SHALL validar los datos nuevamente en el servidor con Zod antes de ejecutar cualquier lógica de negocio.
6. IF el campo `email` no tiene formato de email válido o supera 254 caracteres, THEN THE Request_Validator SHALL rechazar la solicitud y retornar un error de validación que identifica el campo `email` y el motivo del rechazo.
7. IF el campo `fullName` tiene menos de 2 caracteres o supera 200 caracteres, THEN THE Request_Validator SHALL rechazar la solicitud y retornar un error de validación que identifica el campo `fullName` y el motivo del rechazo.
8. IF el campo `phone` está presente y supera 30 caracteres, THEN THE Request_Validator SHALL rechazar la solicitud y retornar un error de validación que identifica el campo `phone` y el motivo del rechazo.
9. IF el campo `academyName` está presente y supera 200 caracteres, THEN THE Request_Validator SHALL rechazar la solicitud y retornar un error de validación que identifica el campo `academyName` y el motivo del rechazo.
10. IF el campo `message` está presente y supera 1000 caracteres, THEN THE Request_Validator SHALL rechazar la solicitud y retornar un error de validación que identifica el campo `message` y el motivo del rechazo.
11. THE Submit_Use_Case SHALL aceptar los campos `phone`, `academyName` y `message` como opcionales, permitiendo que sean nulos o ausentes.
12. IF el Submit_Use_Case encuentra un error de infraestructura inesperado durante la persistencia, THEN THE Submit_Use_Case SHALL retornar un Action_Result con `success: false` y `code: "INTERNAL_ERROR"` sin exponer detalles internos al cliente.
13. WHEN el Server Action retorna un Action_Result con `success: false`, THE Instructor_Request_Form SHALL mostrar los errores de campo en el campo correspondiente (si el código es `VALIDATION_ERROR`) o un mensaje de error global (para otros códigos de error).

---

### Requisito 2: Unicidad de email en solicitudes

**User Story:** Como administrador, quiero que el sistema impida solicitudes duplicadas por email, para que no existan múltiples solicitudes pendientes del mismo instructor.

#### Criterios de Aceptación

1. WHEN el Submit_Use_Case recibe un email, THE Request_Repository SHALL consultar si ya existe una Instructor_Account_Request con ese email y estado `pending` antes de persistir la nueva solicitud.
2. IF ya existe una Instructor_Account_Request con el mismo email y estado `pending` en la tabla, THEN THE Submit_Use_Case SHALL retornar un Action_Result con `success: false` y `code: "CONFLICT"` sin crear una nueva solicitud.
3. IF el Submit_Use_Case retorna un Action_Result con `code: "CONFLICT"`, THEN THE Instructor_Request_Form SHALL mostrar el mensaje de error en el campo `email` sin limpiar ni resetear los demás campos del formulario.

---

### Requisito 3: Gestión de solicitudes por el administrador

**User Story:** Como administrador, quiero ver la lista de solicitudes de cuenta de instructores con sus datos y estado, para poder gestionarlas de forma eficiente.

#### Criterios de Aceptación

1. WHERE un usuario sin sesión activa con rol `admin` intenta acceder al Admin_Dashboard, THE middleware SHALL redirigir la solicitud sin renderizar la página.
2. WHEN un administrador accede al Admin_Dashboard, THE List_Use_Case SHALL retornar las solicitudes ordenadas por fecha de creación descendente (más recientes primero), paginadas con un máximo de 25 registros por página.
3. FOR EACH solicitud listada en el Admin_Dashboard, THE Admin_Dashboard SHALL mostrar: email, nombre completo, teléfono (o vacío si nulo), nombre de academia (o vacío si nulo), mensaje (o vacío si nulo), badge de estado y fecha de creación formateada.
4. FOR EACH solicitud listada, THE Admin_Dashboard SHALL mostrar un badge de estado con el siguiente mapeo de colores: `pending` → amarillo/amber, `approved` → verde, `rejected` → rojo, `observed` → azul.
5. WHERE el estado de una solicitud es `pending`, THE Admin_Dashboard SHALL mostrar los botones de acción Aprobar, Rechazar y Observar para esa fila; WHERE el estado no es `pending`, ninguno de esos botones SHALL estar presente.
6. WHEN el List_Use_Case recibe un filtro de estado, THE List_Use_Case SHALL retornar únicamente las solicitudes que coincidan con ese estado y el total de registros que coinciden; WHEN no se aplica ningún filtro, THE List_Use_Case SHALL retornar solicitudes de todos los estados.

---

### Requisito 4: Aprobación de solicitud

**User Story:** Como administrador, quiero aprobar una solicitud de cuenta de instructor, para que el sistema cree automáticamente su cuenta con el rol correcto y le envíe las instrucciones de acceso.

#### Criterios de Aceptación

1. WHEN un administrador aprueba una solicitud, THE Admin_Action SHALL verificar la sesión y el rol `admin` antes de ejecutar cualquier lógica.
2. WHEN el Approve_Use_Case recibe un `requestId`, THE Request_Repository SHALL recuperar la Instructor_Account_Request correspondiente antes de proceder.
3. IF la Instructor_Account_Request no existe, THEN THE Approve_Use_Case SHALL retornar un Action_Result con `success: false` y `code: "NOT_FOUND"`.
4. WHEN el Approve_Use_Case obtiene la solicitud, THE Status_Validator SHALL verificar que el estado actual sea `pending` antes de continuar.
5. IF el estado de la solicitud no es `pending`, THEN THE Approve_Use_Case SHALL retornar un Action_Result con `success: false` y `code: "INVALID_STATUS_TRANSITION"` sin modificar la solicitud.
6. WHEN la transición de estado es válida, THE Auth_Service SHALL crear un usuario en Supabase Auth con el email del instructor, asignar el rol `instructor` en `app_metadata`, y enviar un email de invitación para establecer contraseña.
7. WHEN el Auth_Service crea el usuario exitosamente, THE Request_Repository SHALL actualizar el estado de la solicitud a `approved`, registrar el `authUserId`, el `approvedBy` (UUID del admin) y el `approvedAt` (timestamp ISO).
8. IF el Auth_Service falla al crear el usuario, THEN THE Approve_Use_Case SHALL retornar un Action_Result con `success: false` y `code: "AUTH_USER_CREATION_ERROR"`, y la solicitud SHALL permanecer en estado `pending` sin ninguna modificación en la base de datos.
9. WHEN la aprobación es exitosa, THE Admin_Action SHALL llamar a `revalidatePath("/admin/instructor-requests")` para actualizar la vista.

---

### Requisito 5: Rechazo de solicitud

**User Story:** Como administrador, quiero rechazar una solicitud de cuenta de instructor, para indicar que no será procesada.

#### Criterios de Aceptación

1. WHEN un administrador rechaza una solicitud, THE Admin_Action SHALL verificar la sesión y el rol `admin` antes de ejecutar cualquier lógica.
2. WHEN el Reject_Use_Case recibe un `requestId`, THE Request_Repository SHALL recuperar la Instructor_Account_Request correspondiente.
3. IF la Instructor_Account_Request no existe, THEN THE Reject_Use_Case SHALL retornar un Action_Result con `success: false` y `code: "NOT_FOUND"`.
4. WHEN el Reject_Use_Case obtiene la solicitud, THE Status_Validator SHALL verificar que el estado actual sea `pending`.
5. IF el estado de la solicitud no es `pending`, THEN THE Reject_Use_Case SHALL retornar un Action_Result con `success: false` y `code: "INVALID_STATUS_TRANSITION"` sin modificar la solicitud.
6. WHEN la transición es válida, THE Request_Repository SHALL actualizar el estado a `rejected`, registrar el `rejectedBy` (UUID del admin) y el `rejectedAt` (timestamp ISO).
7. IF el Request_Repository falla al persistir el rechazo, THEN THE Reject_Use_Case SHALL retornar un Action_Result con `success: false` y `code: "PERSISTENCE_ERROR"`, y la solicitud SHALL permanecer en estado `pending`.
8. WHEN el rechazo es exitoso, THE Admin_Action SHALL llamar a `revalidatePath("/admin/instructor-requests")` para actualizar la vista.

---

### Requisito 6: Observación de solicitud (nota del administrador)

**User Story:** Como administrador, quiero dejar una nota de observación en una solicitud, para comunicar al equipo el motivo de una revisión pendiente o una acción futura.

#### Criterios de Aceptación

1. WHEN un administrador hace clic en "Observar", THE ObserveInstructorRequestButton SHALL mostrar un textarea inline para ingresar la nota.
2. WHILE el textarea de observación está visible y contiene cero caracteres no-whitespace, THE ObserveInstructorRequestButton SHALL mantener el botón de confirmar deshabilitado.
3. WHEN un administrador confirma la observación con una nota que contiene al menos un carácter no-whitespace, THE Admin_Action SHALL verificar la sesión y el rol `admin` antes de ejecutar cualquier lógica.
4. WHEN el Observe_Use_Case recibe un `requestId` y `observationNotes`, THE Request_Repository SHALL recuperar la Instructor_Account_Request correspondiente.
5. IF la Instructor_Account_Request no existe, THEN THE Observe_Use_Case SHALL retornar un Action_Result con `success: false` y `code: "NOT_FOUND"`.
6. IF la Instructor_Account_Request existe, THEN THE Request_Repository SHALL actualizar el estado a `observed`, registrar las `observationNotes` (máximo 1000 caracteres), el `observedBy` (UUID del admin) y el `observedAt` (timestamp ISO).
7. WHEN la observación es exitosa, THE Admin_Action SHALL llamar a `revalidatePath("/admin/instructor-requests")` para actualizar la vista.

---

### Requisito 7: Validación de transiciones de estado

**User Story:** Como sistema, quiero que las transiciones de estado de las solicitudes sean estrictamente controladas, para garantizar la integridad del flujo de gestión.

#### Criterios de Aceptación

1. THE Status_Validator SHALL retornar `true` únicamente para las transiciones `pending → approved`, `pending → rejected` y `pending → observed`.
2. IF se intenta cualquier otra transición de estado (por ejemplo `approved → rejected`, `rejected → approved`, `observed → approved`, `approved → approved`), THEN THE Status_Validator SHALL retornar `false`.
3. THE Status_Validator SHALL ser una función pura sin efectos secundarios: dados los mismos argumentos (estadoActual, estadoDestino), SHALL retornar siempre el mismo resultado booleano.

---

### Requisito 8: Serialización y persistencia de solicitudes

**User Story:** Como sistema, quiero que las solicitudes se persistan correctamente en la base de datos y se puedan recuperar con fidelidad, para garantizar la consistencia de los datos.

#### Criterios de Aceptación

1. WHEN el Request_Repository guarda una Instructor_Account_Request, THE Request_Repository SHALL mapear todos los campos de la entidad de dominio a las columnas correspondientes de la tabla `instructor_account_requests`.
2. WHEN el Request_Repository recupera una fila de la base de datos, THE Request_Repository SHALL mapear todas las columnas a los campos correspondientes de la entidad de dominio `InstructorAccountRequest`.
3. FOR ALL Instructor_Account_Request válidas (con cualquier combinación de campos opcionales presentes o nulos), serializar la entidad a fila de base de datos con `toRow()` y luego deserializar la fila con `toEntity()` SHALL producir una entidad con todos los campos equivalentes a la entidad original.
4. THE Request_Repository SHALL utilizar únicamente consultas parametrizadas a través del cliente Supabase para acceder a la tabla `instructor_account_requests`, sin concatenación de strings SQL.

---

### Requisito 9: Respuestas estructuradas de Server Actions

**User Story:** Como desarrollador, quiero que todas las Server Actions retornen un tipo de resultado estructurado y consistente, para que los componentes cliente puedan manejar éxitos y errores de forma predecible.

#### Criterios de Aceptación

1. THE Admin_Action SHALL retornar siempre un valor del tipo `{ success: true; data: T } | { success: false; error: string; code: string }`, nunca `undefined`, nunca `null`, y nunca un objeto que no cumpla esa forma.
2. IF una Admin_Action captura un error de dominio conocido (`NOT_FOUND`, `CONFLICT`, `INVALID_STATUS_TRANSITION`, `AUTH_USER_CREATION_ERROR`, `PERSISTENCE_ERROR`, `FORBIDDEN`), THEN THE Admin_Action SHALL retornar un Action_Result con `success: false`, el `code` correspondiente, y un mensaje de error en español legible para el usuario, sin exponer detalles de infraestructura.
3. IF una Admin_Action encuentra un error inesperado no clasificado, THEN THE Admin_Action SHALL registrar el error completo en el servidor (console.error) y retornar un Action_Result con `success: false`, `code: "INTERNAL_ERROR"` y un mensaje genérico en español.
4. THE Submit_Use_Case Server Action SHALL retornar siempre un valor del tipo `{ success: true; data: { id: string } } | { success: false; error: string; code: string }`.

---

### Requisito 10: Seguridad y autorización

**User Story:** Como administrador de seguridad, quiero que las operaciones de gestión de solicitudes estén protegidas por autenticación y autorización, para que solo los administradores puedan aprobar, rechazar u observar solicitudes.

#### Criterios de Aceptación

1. WHEN cualquier Admin_Action es invocada, THE Admin_Action SHALL verificar la sesión activa del usuario como primera operación, antes de cualquier lógica de negocio o acceso a datos.
2. IF el usuario no tiene una sesión activa válida, THEN THE Admin_Action SHALL retornar un Action_Result con `success: false` y `code: "FORBIDDEN"` sin ejecutar ninguna operación de lectura ni escritura.
3. IF el usuario tiene sesión activa pero su `app_metadata.role` no es `admin`, THEN THE Admin_Action SHALL retornar un Action_Result con `success: false` y `code: "FORBIDDEN"` sin ejecutar ninguna operación.
4. THE Auth_Service SHALL utilizar exclusivamente el cliente Supabase con `service_role key` (`adminSupabase`) para crear usuarios en Supabase Auth, nunca el cliente anónimo ni credenciales del cliente.
5. THE Request_Repository SHALL estar marcado con `import "server-only"` al inicio del archivo para prevenir su importación accidental en componentes cliente.
6. THE Admin_Action SHALL nunca incluir en su Action_Result el `authUserId`, tokens de autenticación, stack traces, mensajes de error de SQL, ni ningún detalle de infraestructura interna.

---

### Requisito 11: Navegación y enrutamiento

**User Story:** Como usuario del sistema, quiero que las rutas del módulo estén correctamente configuradas, para que el formulario público sea accesible sin autenticación y el panel de administración esté protegido.

#### Criterios de Aceptación

1. THE middleware SHALL incluir `/instructor-registration` en `PUBLIC_ROUTES`, de modo que cualquier solicitud a esa ruta sea procesada sin verificación de sesión.
2. WHERE un usuario sin sesión activa con rol `admin` realiza una solicitud HTTP a `/admin/instructor-requests`, THE middleware SHALL redirigir la solicitud a `/login` sin renderizar la página.
3. WHERE un usuario con sesión activa y rol `admin` accede al Admin_Dashboard, THE DashboardNav SHALL mostrar un enlace de navegación hacia `/admin/instructor-requests`; WHERE el rol del usuario no es `admin`, ese enlace no SHALL estar presente en el DOM.

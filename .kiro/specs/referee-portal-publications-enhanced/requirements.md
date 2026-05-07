# Documento de Requisitos: Portal de Árbitros — Publicaciones Mejoradas

## Introducción

Este documento define los requisitos funcionales y no funcionales para la mejora del módulo de publicaciones del portal de árbitros de Kombat Taekwondo Chile. La mejora abarca tres pilares principales:

1. **Soporte de imágenes de portada** en publicaciones del portal, con almacenamiento en Supabase Storage.
2. **Rediseño visual de la experiencia UX** tanto para administradores (vista de gestión) como para árbitros (vista de consumo estilo magazine/blog).
3. **Inscripción de árbitros a eventos** publicados con categoría `championship`, incluyendo gestión de cupos, plazos y vista administrativa de inscritos.

El sistema se construye sobre la infraestructura existente de Next.js App Router, Supabase (base de datos y Storage) y Clean Architecture con screaming architecture. La entidad `RefereePortalPublication` se extiende sin reemplazarse, y se añade la nueva entidad `RefereeEventRegistration` para gestionar las inscripciones.

---

## Glosario

- **Sistema**: La aplicación web Kombat Taekwondo Chile construida con Next.js y Supabase.
- **Admin**: Usuario autenticado con registro en la tabla `admin_users`. Tiene permisos para crear, editar y eliminar publicaciones.
- **Árbitro**: Usuario autenticado con registro aprobado en `referee_registrations` (estado `approved`) y con `auth_user_id` asignado. Tiene acceso de solo lectura al portal y puede inscribirse a eventos.
- **Publicación**: Registro en la tabla `referee_portal_publications`. Puede ser de categoría `news`, `regulation` o `championship`.
- **Evento**: Publicación de categoría `championship` con el campo `is_event = true`. Tiene fecha, lugar, cupo máximo opcional y plazo de inscripción.
- **Inscripción**: Registro en la tabla `referee_event_registrations` que vincula a un árbitro con un evento.
- **Imagen_de_Portada**: Archivo de imagen (JPEG, PNG o WebP) almacenado en el bucket `referee-portal-images` de Supabase Storage, asociado a una publicación.
- **PublicationForm**: Componente Client Component del formulario de creación y edición de publicaciones usado por el Admin.
- **PortalPublicationList**: Componente Server Component que renderiza la lista de publicaciones en el dashboard del Árbitro.
- **EventRegistrationButton**: Componente Client Component que permite al Árbitro inscribirse o desinscribirse de un evento.
- **AdminPublicationCard**: Componente Server Component que muestra una publicación en la lista de administración con thumbnail y acciones.
- **PublicationCard**: Componente Server Component que muestra una publicación individual en el dashboard del Árbitro.
- **EventCard**: Componente Server Component variante de PublicationCard para publicaciones de tipo evento.
- **Repositorio_Publicaciones**: Implementación de `RefereePortalPublicationRepository` en Supabase.
- **Repositorio_Inscripciones**: Implementación de `RefereeEventRegistrationRepository` en Supabase.
- **Storage**: Bucket `referee-portal-images` en Supabase Storage.
- **Server_Action**: Función de servidor Next.js marcada con `"use server"` que ejecuta mutaciones.

---

## Requisitos

### Requisito 1: Soporte de Imagen de Portada en Publicaciones

**Historia de usuario:** Como administrador, quiero poder adjuntar una imagen de portada a cada publicación, para que el portal tenga una presentación visual más atractiva y profesional.

#### Criterios de Aceptación

1. WHEN un Admin completa el formulario de publicación y selecciona un archivo de imagen, THE PublicationForm SHALL aceptar únicamente archivos de tipo `image/jpeg`, `image/png` o `image/webp` con un tamaño máximo de 5 MB (5.242.880 bytes).
2. IF el archivo seleccionado supera los 5 MB o tiene un tipo MIME no permitido, THEN THE PublicationForm SHALL mostrar un mensaje de error de validación y no enviar el formulario.
3. WHEN un Admin selecciona una imagen válida en el formulario, THE PublicationForm SHALL mostrar una previsualización de la imagen antes de enviar el formulario, usando `URL.createObjectURL`.
4. WHEN el Server_Action de creación o edición recibe un archivo de imagen válido, THE Sistema SHALL subir la imagen al Storage bajo la ruta `{publicationId}/cover.{ext}` y almacenar la ruta resultante en el campo `cover_image_path` de la publicación.
5. WHEN el Server_Action de creación o edición recibe un archivo de imagen, THE Sistema SHALL validar el tipo MIME del archivo en el servidor antes de subirlo al Storage, independientemente de la validación del cliente.
6. IF el upload al Storage falla durante la creación o edición de una publicación, THEN THE Sistema SHALL retornar `{ success: false, error: "Error al subir la imagen. Por favor intenta nuevamente.", code: "STORAGE_ERROR" }` y NO persistir la publicación en la base de datos.
7. WHEN una publicación tiene `cover_image_path` no nulo, THE PublicationCard SHALL renderizar la imagen de portada de forma prominente en la vista del Árbitro.
8. WHEN una publicación no tiene imagen de portada (`cover_image_path` es nulo), THE PublicationCard SHALL renderizar un diseño alternativo sin imagen que mantenga la coherencia visual.
9. WHEN un Admin elimina una publicación que tiene `cover_image_path` no nulo, THE Sistema SHALL intentar eliminar el archivo correspondiente del Storage antes de eliminar el registro de la base de datos.
10. IF la eliminación del archivo del Storage falla al eliminar una publicación, THEN THE Sistema SHALL registrar el error en el servidor, proceder con la eliminación del registro de la base de datos y retornar `{ success: true }`.
11. THE Sistema SHALL permitir que cualquier publicación, independientemente de su categoría, tenga una imagen de portada.

---

### Requisito 2: Rediseño Visual — Vista del Árbitro (Estilo Magazine/Blog)

**Historia de usuario:** Como árbitro, quiero ver las publicaciones del portal en un formato visual atractivo estilo magazine, para poder identificar rápidamente el tipo de contenido y acceder a la información relevante.

#### Criterios de Aceptación

1. WHEN un Árbitro accede al dashboard del portal, THE PortalPublicationList SHALL renderizar cada publicación usando el componente PublicationCard con variante visual según su categoría.
2. WHEN se renderiza una publicación de categoría `news`, THE PublicationCard SHALL mostrar la imagen de portada (si existe), el título, un extracto del cuerpo, la fecha de publicación y un badge de color azul con la etiqueta "Noticias".
3. WHEN se renderiza una publicación de categoría `regulation`, THE PublicationCard SHALL mostrar un ícono de documento, el título, la fecha de publicación y un badge de color ámbar con la etiqueta "Reglamento", sin imagen de portada prominente.
4. WHEN se renderiza una publicación de categoría `championship` con `isEvent = false`, THE PublicationCard SHALL mostrar la imagen de portada (si existe), el título, un extracto del cuerpo, la fecha de publicación y un badge de color verde esmeralda con la etiqueta "Campeonato".
5. WHEN se renderiza una publicación de categoría `championship` con `isEvent = true`, THE EventCard SHALL mostrar un banner visual con la etiqueta "EVENTO", la imagen de portada (si existe), el título, la fecha del evento, el lugar del evento, los cupos disponibles y el botón de inscripción.
6. WHEN no hay publicaciones disponibles en el portal, THE PortalPublicationList SHALL mostrar un mensaje indicando que no hay publicaciones disponibles.
7. THE PortalPublicationList SHALL obtener las publicaciones y las inscripciones del Árbitro actual en paralelo usando `Promise.all()` para evitar waterfalls de red.

---

### Requisito 3: Rediseño Visual — Vista del Administrador

**Historia de usuario:** Como administrador, quiero ver la lista de publicaciones con thumbnails de imagen y datos relevantes de cada publicación, para gestionar el contenido del portal de forma más eficiente.

#### Criterios de Aceptación

1. WHEN un Admin accede a la lista de publicaciones, THE AdminPublicationCard SHALL mostrar el thumbnail de la imagen de portada para las publicaciones que tienen imagen (`cover_image_path` no nulo).
2. WHEN un Admin accede a la lista de publicaciones, THE AdminPublicationCard SHALL mostrar el badge de categoría con el color correspondiente para cada publicación.
3. WHEN se muestra una publicación con `isEvent = true` en la lista de administración, THE AdminPublicationCard SHALL mostrar un indicador "Evento" junto con el contador de árbitros inscritos.
4. WHEN un Admin accede a la lista de publicaciones, THE AdminPublicationCard SHALL mostrar los botones de "Editar" y "Eliminar" para cada publicación.
5. WHEN un Admin accede al formulario de creación o edición de una publicación de categoría `championship`, THE PublicationForm SHALL mostrar un checkbox `isEvent` para indicar si la publicación es un evento.
6. WHEN el checkbox `isEvent` está marcado en el PublicationForm, THE PublicationForm SHALL mostrar los campos adicionales: `eventDate` (fecha del evento), `eventLocation` (lugar), `maxParticipants` (cupo máximo, opcional) y `registrationDeadline` (plazo de inscripción).
7. WHEN el checkbox `isEvent` no está marcado o la categoría no es `championship`, THE PublicationForm SHALL ocultar los campos de evento y no enviarlos en el formulario.

---

### Requisito 4: Inscripción de Árbitros a Eventos

**Historia de usuario:** Como árbitro, quiero poder inscribirme a los eventos publicados en el portal, para confirmar mi participación y que los organizadores puedan gestionar los cupos.

#### Criterios de Aceptación

1. WHEN un Árbitro autenticado hace clic en "Inscribirse" en un EventCard, THE EventRegistrationButton SHALL llamar al Server_Action de inscripción con el `publicationId` del evento.
2. WHEN el Server_Action de inscripción recibe una solicitud válida de un Árbitro no inscrito en un evento con cupo disponible y plazo vigente, THE Sistema SHALL crear un registro en `referee_event_registrations` y retornar `{ success: true }`.
3. WHEN la inscripción es exitosa, THE EventRegistrationButton SHALL cambiar su estado visual a "Inscrito ✓" sin recargar la página.
4. WHEN un Árbitro ya inscrito intenta inscribirse nuevamente al mismo evento, THE Sistema SHALL retornar `{ success: false, error: "Ya estás inscrito en este evento.", code: "ALREADY_REGISTERED" }`.
5. WHEN el número de inscritos en un evento es igual a `maxParticipants`, THE Sistema SHALL retornar `{ success: false, error: "El evento ha alcanzado el cupo máximo.", code: "AT_CAPACITY" }` ante cualquier nuevo intento de inscripción.
6. WHEN la fecha actual es posterior a `registrationDeadline` de un evento, THE Sistema SHALL retornar `{ success: false, error: "El plazo de inscripción ha cerrado.", code: "DEADLINE_PASSED" }` ante cualquier intento de inscripción.
7. WHEN `maxParticipants` es nulo en un evento, THE Sistema SHALL permitir inscripciones sin aplicar límite de cupo.
8. WHEN un Árbitro hace clic en "Desinscribirse" en un EventCard donde está inscrito, THE EventRegistrationButton SHALL llamar al Server_Action de desinscripción con el `publicationId`.
9. WHEN el Server_Action de desinscripción recibe una solicitud válida de un Árbitro inscrito, THE Sistema SHALL eliminar el registro correspondiente de `referee_event_registrations` y retornar `{ success: true }`.
10. WHEN un Árbitro intenta desinscribirse de un evento en el que no está inscrito, THE Sistema SHALL retornar `{ success: false, error: "No estás inscrito en este evento.", code: "NOT_FOUND" }`.
11. WHILE el `registrationDeadline` de un evento ha pasado, THE EventRegistrationButton SHALL permanecer deshabilitado e indicar que el plazo ha cerrado.
12. WHILE un evento está lleno (`isFull = true`), THE EventRegistrationButton SHALL permanecer deshabilitado e indicar que no hay cupos disponibles.
13. WHEN el EventRegistrationButton está procesando una solicitud, THE EventRegistrationButton SHALL mostrar un estado de carga usando `useTransition` y deshabilitar el botón para evitar doble envío.

---

### Requisito 5: Vista Administrativa de Inscripciones a Eventos

**Historia de usuario:** Como administrador, quiero ver la lista de árbitros inscritos en cada evento, para gestionar la participación y planificar la logística del campeonato.

#### Criterios de Aceptación

1. WHEN un Admin accede a `/admin/referee-registrations/publications/{id}/registrations`, THE Sistema SHALL mostrar la lista de árbitros inscritos en ese evento con el nombre completo, email y fecha de inscripción de cada uno.
2. WHEN no hay árbitros inscritos en un evento, THE Sistema SHALL mostrar un mensaje indicando que no hay inscritos aún.
3. WHEN un Admin accede a la vista de inscritos, THE Sistema SHALL verificar que el usuario tiene rol admin antes de mostrar cualquier dato, redirigiendo a `/dashboard` si no lo tiene.
4. THE Sistema SHALL obtener la lista de inscritos mediante el caso de uso `listEventRegistrations` que delega al Repositorio_Inscripciones, siguiendo la arquitectura limpia del proyecto.
5. WHEN la publicación solicitada no existe o no es un evento (`isEvent = false`), THE Sistema SHALL retornar un error 404.

---

### Requisito 6: Migración de Base de Datos

**Historia de usuario:** Como desarrollador, quiero que la base de datos se actualice con las nuevas columnas y tablas necesarias, para que el sistema pueda almacenar los datos de imágenes, eventos e inscripciones.

#### Criterios de Aceptación

1. THE Sistema SHALL aplicar una migración SQL que agregue las columnas `cover_image_path` (TEXT, nullable), `is_event` (BOOLEAN, NOT NULL, DEFAULT false), `event_date` (DATE, nullable), `event_location` (TEXT, nullable, máx 500 caracteres), `max_participants` (INTEGER, nullable, > 0) y `registration_deadline` (DATE, nullable) a la tabla `referee_portal_publications`.
2. THE Sistema SHALL aplicar el constraint `chk_event_fields_require_is_event` que impide que los campos `event_date`, `event_location`, `max_participants` y `registration_deadline` tengan valores no nulos cuando `is_event = false`.
3. THE Sistema SHALL aplicar el constraint `chk_is_event_requires_championship` que impide que `is_event = true` para publicaciones con categoría distinta de `championship`.
4. THE Sistema SHALL crear la tabla `referee_event_registrations` con las columnas `id` (UUID, PK), `publication_id` (UUID, FK → `referee_portal_publications.id` ON DELETE CASCADE), `referee_user_id` (UUID, NOT NULL), `registered_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now()) y `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now()).
5. THE Sistema SHALL aplicar el constraint de unicidad `uq_referee_event_registration` sobre el par `(publication_id, referee_user_id)` en la tabla `referee_event_registrations`.
6. THE Sistema SHALL crear los índices `idx_referee_event_registrations_publication` sobre `publication_id` e `idx_referee_event_registrations_referee` sobre `referee_user_id` en la tabla `referee_event_registrations`.
7. THE Sistema SHALL crear el bucket `referee-portal-images` en Supabase Storage con `allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"]` y `fileSizeLimit: 5242880` bytes.

---

### Requisito 7: Seguridad y Autorización

**Historia de usuario:** Como administrador del sistema, quiero que todas las operaciones del portal de árbitros estén protegidas por autenticación y autorización adecuadas, para garantizar que solo los usuarios con los permisos correctos puedan realizar cada acción.

#### Criterios de Aceptación

1. WHEN un usuario no autenticado intenta acceder a cualquier Server_Action del portal de árbitros, THE Sistema SHALL redirigir al usuario a `/login` antes de ejecutar cualquier lógica de negocio.
2. WHEN un usuario autenticado sin rol admin intenta crear, editar o eliminar una publicación, THE Sistema SHALL redirigir al usuario a `/dashboard` y no ejecutar la operación.
3. WHEN un usuario autenticado sin rol referee intenta inscribirse o desinscribirse de un evento, THE Sistema SHALL retornar `{ success: false, error: "Acceso denegado.", code: "FORBIDDEN" }`.
4. WHEN un Árbitro intenta desinscribir a otro árbitro de un evento, THE Sistema SHALL verificar que la inscripción pertenece al árbitro autenticado y retornar `{ success: false, error: "Acceso denegado.", code: "FORBIDDEN" }` si no es así.
5. THE Sistema SHALL realizar el upload de imágenes de portada exclusivamente en el servidor usando el cliente `adminSupabase`, sin exponer credenciales de Storage al cliente.
6. WHEN el Server_Action de creación o edición de publicaciones recibe un archivo de imagen, THE Sistema SHALL validar el tipo MIME del archivo en el servidor antes de subirlo al Storage.
7. WHEN un Admin accede a la vista de inscritos de un evento, THE Sistema SHALL verificar el rol admin en el servidor antes de retornar cualquier dato de árbitros (nombre, email).
8. THE Sistema SHALL aplicar las políticas RLS del bucket `referee-portal-images` de forma que solo admins puedan subir, actualizar y eliminar imágenes, mientras que árbitros autenticados y admins puedan leerlas.
9. WHEN cualquier Server_Action recibe datos externos, THE Sistema SHALL validar todos los campos con Zod antes de ejecutar cualquier operación de base de datos o Storage.
10. IF un Server_Action captura un error inesperado, THEN THE Sistema SHALL registrar el error en el servidor con contexto suficiente para depuración y retornar `{ success: false, error: "Ha ocurrido un error inesperado.", code: "INTERNAL_ERROR" }` al cliente, sin exponer detalles internos.

---

### Requisito 8: Integridad del Dominio

**Historia de usuario:** Como desarrollador, quiero que las entidades del dominio mantengan sus invariantes en todo momento, para garantizar la consistencia de los datos en la base de datos y en la capa de aplicación.

#### Criterios de Aceptación

1. THE Sistema SHALL garantizar que `isEvent = true` solo sea posible en publicaciones con `category = "championship"`, tanto a nivel de constraint de base de datos como en la lógica de la capa de aplicación.
2. THE Sistema SHALL garantizar que los campos `eventDate`, `eventLocation`, `maxParticipants` y `registrationDeadline` sean siempre `null` cuando `isEvent = false`, tanto a nivel de constraint de base de datos como en la lógica de la capa de aplicación.
3. THE Sistema SHALL garantizar que no existan dos registros en `referee_event_registrations` con el mismo par `(publication_id, referee_user_id)`, tanto a nivel de constraint de base de datos como verificando duplicados en el caso de uso `registerForEvent` antes de insertar.
4. WHEN el caso de uso `registerForEvent` verifica el cupo disponible, THE Sistema SHALL comparar el conteo actual de inscritos con `maxParticipants` en la misma transacción lógica para evitar condiciones de carrera.
5. THE Sistema SHALL garantizar que toda `RefereeEventRegistration` referencia una publicación con `isEvent = true`, verificándolo en el caso de uso `registerForEvent` antes de crear la inscripción.
6. WHEN se elimina una publicación de tipo evento, THE Sistema SHALL eliminar en cascada todos los registros de `referee_event_registrations` asociados mediante la cláusula `ON DELETE CASCADE` de la clave foránea.

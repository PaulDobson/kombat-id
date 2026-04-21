# Documento de Requisitos

## Introducción

Este documento describe las mejoras al sistema de eventos marciales existente (`martial_events`). Se añaden capacidades de inscripción de participantes, control de aforo, precios y un flujo de confirmación diferenciado según si el evento es gratuito o de pago. Los instructores podrán inscribir a sus alumnos desde su panel, y el administrador podrá gestionar y confirmar inscripciones desde el panel de administración.

## Glosario

- **Sistema**: El sistema de gestión de eventos marciales (aplicación Next.js/Supabase).
- **Admin**: Usuario con rol de administrador registrado en la tabla `admin_users`.
- **Instructor**: Practicante con `role = 'instructor'` en la tabla `practitioners`.
- **Alumno**: Practicante con `instructor_id` apuntando al Instructor que lo gestiona.
- **Evento**: Registro en la tabla `martial_events` (competencia, seminario o examen).
- **Inscripción**: Registro en la tabla `event_registrations` que vincula un Alumno con un Evento.
- **Estado_Inscripcion**: Valor del campo `status` de una Inscripción. Puede ser `pendiente_pago` o `confirmada`.
- **Evento_Gratuito**: Evento cuyo campo `registration_fee` es `null` o `0`.
- **Evento_Pagado**: Evento cuyo campo `registration_fee` es mayor que `0`.
- **Aforo_Maximo**: Valor del campo `max_participants` de un Evento. Cuando se alcanza, no se permiten nuevas inscripciones.
- **Aforo_Minimo**: Valor del campo `min_participants` de un Evento. Valor informativo mínimo de participantes esperados.
- **Panel_Inscripciones**: Página `/admin/events/[eventId]/registrations` donde el Admin gestiona las inscripciones de un Evento.
- **Panel_Instructor**: Sección `/instructor/events` donde el Instructor inscribe a sus Alumnos.

---

## Requisitos

### Requisito 1: Descripción detallada del evento

**User Story:** Como Admin, quiero añadir una descripción larga opcional a un evento, para que los participantes tengan información detallada sobre el mismo.

#### Criterios de Aceptación

1. THE Sistema SHALL almacenar un campo `description` de tipo texto largo (hasta 5000 caracteres) en la tabla `martial_events`, siendo su valor nulo cuando no se proporciona.
2. WHEN el Admin crea o edita un evento, THE Sistema SHALL mostrar un campo de texto multilínea opcional etiquetado "Descripción" en el formulario.
3. WHEN el Admin guarda un evento con descripción, THE Sistema SHALL persistir el valor del campo `description` sin modificar su contenido.
4. WHEN el Admin guarda un evento sin descripción, THE Sistema SHALL almacenar `null` en el campo `description`.
5. WHEN se visualiza el detalle de un evento con descripción, THE Sistema SHALL mostrar el contenido del campo `description` en la página de detalle.
6. IF el campo `description` supera los 5000 caracteres, THEN THE Sistema SHALL rechazar el formulario y mostrar el mensaje "La descripción no puede superar los 5000 caracteres".

---

### Requisito 2: Precio de inscripción

**User Story:** Como Admin, quiero definir un precio de inscripción para un evento o marcarlo como entrada libre, para que el flujo de inscripción refleje si se requiere pago.

#### Criterios de Aceptación

1. THE Sistema SHALL almacenar un campo `registration_fee` de tipo numérico con dos decimales (NUMERIC(10,2)) en la tabla `martial_events`, siendo su valor `null` cuando el evento es de entrada libre.
2. WHEN el Admin crea o edita un evento, THE Sistema SHALL mostrar un campo numérico opcional etiquetado "Precio de inscripción" y una casilla de verificación etiquetada "Entrada libre".
3. WHEN el Admin marca la casilla "Entrada libre", THE Sistema SHALL deshabilitar el campo de precio y almacenar `null` en `registration_fee`.
4. WHEN el Admin introduce un precio mayor que `0`, THE Sistema SHALL almacenar ese valor en `registration_fee` y desmarcar la casilla "Entrada libre".
5. IF el Admin introduce un valor negativo en el campo de precio, THEN THE Sistema SHALL rechazar el formulario y mostrar el mensaje "El precio no puede ser negativo".
6. IF el Admin introduce un valor no numérico en el campo de precio, THEN THE Sistema SHALL rechazar el formulario y mostrar el mensaje "El precio debe ser un número válido".
7. WHEN se visualiza el detalle de un evento, THE Sistema SHALL mostrar "Entrada libre" si `registration_fee` es `null` o `0`, o el precio formateado con símbolo de moneda en caso contrario.

---

### Requisito 3: Mínimo y máximo de participantes

**User Story:** Como Admin, quiero definir límites de participantes en un evento, para controlar el aforo y cerrar automáticamente las inscripciones cuando se alcance el máximo.

#### Criterios de Aceptación

1. THE Sistema SHALL almacenar los campos `min_participants` y `max_participants` de tipo entero positivo en la tabla `martial_events`, siendo ambos `null` cuando no se definen.
2. WHEN el Admin crea o edita un evento, THE Sistema SHALL mostrar campos numéricos opcionales etiquetados "Mínimo de participantes" y "Máximo de participantes".
3. IF el Admin introduce un valor de `max_participants` menor que `min_participants`, THEN THE Sistema SHALL rechazar el formulario y mostrar el mensaje "El máximo de participantes debe ser mayor o igual al mínimo".
4. IF el Admin introduce un valor menor que `1` en cualquiera de los campos de participantes, THEN THE Sistema SHALL rechazar el formulario y mostrar el mensaje "El valor debe ser mayor que cero".
5. WHEN el número de inscripciones con `status = 'confirmada'` de un Evento alcanza el valor de `max_participants`, THE Sistema SHALL impedir nuevas inscripciones para ese Evento y mostrar el mensaje "El evento ha alcanzado el aforo máximo".
6. WHEN se visualiza el detalle de un evento con `max_participants` definido, THE Sistema SHALL mostrar el número de inscripciones confirmadas y el aforo máximo en formato "X / Y inscritos".

---

### Requisito 4: Inscripción de alumnos por instructor

**User Story:** Como Instructor, quiero inscribir a mis alumnos en eventos disponibles desde mi panel, para gestionar su participación sin necesidad de intervención del Admin.

#### Criterios de Aceptación

1. THE Sistema SHALL exponer una sección en el panel del Instructor en la ruta `/instructor/events` que liste los Eventos con fecha futura.
2. WHEN el Instructor accede a la sección de inscripción de un Evento, THE Sistema SHALL mostrar únicamente los Alumnos cuyo `instructor_id` coincida con el identificador del Instructor autenticado.
3. WHEN el Instructor selecciona uno o más Alumnos y confirma la inscripción, THE Sistema SHALL crear un registro en `event_registrations` por cada Alumno seleccionado.
4. IF un Alumno ya tiene una Inscripción activa en el mismo Evento, THEN THE Sistema SHALL omitir ese Alumno de la operación y mostrar el mensaje "El alumno [nombre] ya está inscrito en este evento".
5. IF el Evento ha alcanzado el Aforo_Maximo en el momento de la inscripción, THEN THE Sistema SHALL rechazar la operación y mostrar el mensaje "El evento ha alcanzado el aforo máximo".
6. WHEN el Instructor completa la inscripción de uno o más Alumnos, THE Sistema SHALL mostrar un resumen con los nombres de los Alumnos inscritos correctamente.
7. WHILE el Instructor no tiene Alumnos asignados, THE Sistema SHALL mostrar el mensaje "No tienes alumnos asignados para inscribir".

---

### Requisito 5: Flujo de confirmación según tipo de evento

**User Story:** Como Admin, quiero que las inscripciones en eventos gratuitos se confirmen automáticamente y las de eventos de pago queden pendientes hasta confirmar el pago, para reflejar el estado real de cada inscripción.

#### Criterios de Aceptación

1. WHEN se crea una Inscripción en un Evento_Gratuito, THE Sistema SHALL asignar `status = 'confirmada'` de forma inmediata sin intervención del Admin.
2. WHEN se crea una Inscripción en un Evento_Pagado, THE Sistema SHALL asignar `status = 'pendiente_pago'` y registrar la fecha de creación en `registered_at`.
3. WHEN el Admin confirma el pago de una Inscripción con `status = 'pendiente_pago'`, THE Sistema SHALL actualizar el `status` a `'confirmada'` y registrar la fecha en `confirmed_at`.
4. IF se intenta confirmar una Inscripción que ya tiene `status = 'confirmada'`, THEN THE Sistema SHALL rechazar la operación y mostrar el mensaje "Esta inscripción ya está confirmada".
5. THE Sistema SHALL almacenar los campos `status`, `registered_at`, `confirmed_at` y `confirmed_by` en la tabla `event_registrations`.
6. WHEN el Admin cancela una Inscripción, THE Sistema SHALL actualizar el `status` a `'cancelada'` y registrar la fecha en `cancelled_at`.

---

### Requisito 6: Panel de inscripciones para el administrador

**User Story:** Como Admin, quiero ver todas las inscripciones de un evento con su estado de pago y poder confirmar pagos pendientes, para gestionar la participación de forma centralizada.

#### Criterios de Aceptación

1. THE Sistema SHALL exponer una página en la ruta `/admin/events/[eventId]/registrations` accesible únicamente para el Admin.
2. WHEN el Admin accede al Panel_Inscripciones de un Evento, THE Sistema SHALL mostrar una tabla con las columnas: nombre del Alumno, nombre del Instructor, estado de la Inscripción y fecha de inscripción.
3. WHEN el Admin visualiza el Panel_Inscripciones, THE Sistema SHALL mostrar el recuento total de inscripciones agrupado por estado (`pendiente_pago`, `confirmada`, `cancelada`).
4. WHEN el Admin hace clic en "Confirmar pago" en una Inscripción con `status = 'pendiente_pago'`, THE Sistema SHALL ejecutar la acción de confirmación y actualizar la vista sin recargar la página completa.
5. IF ocurre un error al confirmar el pago, THEN THE Sistema SHALL mostrar un mensaje de error descriptivo sin modificar el estado de la Inscripción.
6. WHEN el Admin accede al Panel_Inscripciones, THE Sistema SHALL mostrar un enlace de retorno a la página de detalle del Evento.
7. WHERE el Evento tiene `max_participants` definido, THE Sistema SHALL mostrar el indicador de aforo "X / Y inscritos confirmados" en la cabecera del Panel_Inscripciones.

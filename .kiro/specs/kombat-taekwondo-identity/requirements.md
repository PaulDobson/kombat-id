# Requirements Document

## Introduction

Kombat Taekwondo Identity es una plataforma digital que registra y gestiona la identidad oficial de cada practicante de Kombat Taekwondo en Chile. La plataforma centraliza la identidad única del practicante, su historial marcial, ranking y certificaciones, proporcionando un registro verificable y persistente que acompaña al atleta a lo largo de su trayectoria en la disciplina.

El sistema se integra sobre la infraestructura existente de autenticación (Supabase Auth) y sigue la arquitectura Clean + Screaming Architecture del proyecto base.

---

## Glossary

- **Practicante**: Persona registrada en la plataforma con una identidad digital activa en Kombat Taekwondo Chile.
- **Identity_System**: El sistema de gestión de identidad digital de Kombat Taekwondo.
- **Perfil**: Representación digital única de un Practicante, que incluye datos personales, grado actual y estado activo.
- **Historial_Marcial**: Registro cronológico de eventos marciales (competencias, seminarios, exámenes) en los que participó un Practicante.
- **Ranking**: Posición relativa de un Practicante dentro de su categoría de peso, edad y grado, calculada a partir de resultados en competencias.
- **Certificacion**: Documento digital emitido por la organización que acredita un logro oficial del Practicante (grado, instructor, árbitro, etc.).
- **Grado**: Nivel técnico del Practicante expresado en cinturón (blanco, amarillo, verde, azul, rojo, negro) y dan (para cinturón negro).
- **Evento_Marcial**: Competencia, seminario o examen oficial registrado en el sistema.
- **Administrador**: Usuario con rol privilegiado que puede registrar Practicantes, emitir Certificaciones y gestionar Eventos_Marciales.
- **QR_Code**: Código de verificación único asociado al Perfil de un Practicante para validación presencial.

---

## Requirements

### Requirement 1: Identidad Única del Practicante

**User Story:** Como practicante de Kombat Taekwondo, quiero tener un perfil de identidad digital único, para que mi información oficial esté centralizada y sea verificable por cualquier miembro de la organización.

#### Acceptance Criteria

1. THE Identity_System SHALL asignar un identificador único e inmutable a cada Practicante en el momento de su registro.
2. WHEN un Practicante completa el registro, THE Identity_System SHALL crear un Perfil con nombre completo, RUT, fecha de nacimiento, género, grado actual y fecha de inicio en la disciplina.
3. THE Identity_System SHALL garantizar que no existan dos Perfiles con el mismo RUT.
4. IF un RUT ya está registrado en el sistema, THEN THE Identity_System SHALL rechazar el registro y retornar un mensaje de error descriptivo.
5. THE Identity_System SHALL asociar el Perfil del Practicante a su cuenta de autenticación de forma unívoca.
6. WHEN un Practicante actualiza sus datos personales, THE Identity_System SHALL registrar la fecha y hora de la última modificación.
7. THE Identity_System SHALL exponer un identificador público del Perfil (distinto al RUT) para uso en URLs y referencias externas.

---

### Requirement 2: Gestión del Perfil del Practicante

**User Story:** Como practicante, quiero visualizar y mantener actualizado mi perfil, para que mi información refleje mi estado actual en la disciplina.

#### Acceptance Criteria

1. WHEN un Practicante autenticado accede a su perfil, THE Identity_System SHALL mostrar todos los campos del Perfil incluyendo nombre, grado actual, estado activo/inactivo y fecha de inicio.
2. THE Identity_System SHALL permitir al Practicante actualizar su foto de perfil, número de contacto y dirección de correo electrónico de contacto.
3. THE Identity_System SHALL impedir que el Practicante modifique su RUT, fecha de nacimiento o grado actual sin intervención de un Administrador.
4. WHEN un Practicante sube una foto de perfil, THE Identity_System SHALL aceptar únicamente archivos en formato JPEG o PNG con un tamaño máximo de 5 MB.
5. IF el archivo de foto de perfil supera 5 MB o no es JPEG ni PNG, THEN THE Identity_System SHALL rechazar la carga y retornar un mensaje de error descriptivo.
6. WHILE un Practicante tiene estado inactivo, THE Identity_System SHALL mostrar su Perfil como solo lectura sin permitir modificaciones.

---

### Requirement 3: Historial Marcial

**User Story:** Como practicante, quiero que mis participaciones en eventos oficiales queden registradas en mi historial, para que mi trayectoria marcial sea verificable y permanente.

#### Acceptance Criteria

1. THE Identity_System SHALL registrar cada participación de un Practicante en un Evento_Marcial con fecha, tipo de evento, resultado y observaciones.
2. WHEN un Administrador registra la participación de un Practicante en un Evento_Marcial, THE Identity_System SHALL agregar la entrada al Historial_Marcial del Practicante con marca de tiempo de creación.
3. THE Identity_System SHALL ordenar el Historial_Marcial de un Practicante de forma cronológica descendente por defecto.
4. WHEN un Practicante consulta su Historial_Marcial, THE Identity_System SHALL retornar todas las entradas asociadas a su identificador único.
5. THE Identity_System SHALL clasificar cada entrada del Historial_Marcial en una de las siguientes categorías: competencia, seminario o examen.
6. IF un Administrador intenta registrar una participación duplicada para el mismo Practicante y Evento_Marcial, THEN THE Identity_System SHALL rechazar la operación y retornar un mensaje de error descriptivo.
7. THE Identity_System SHALL preservar el Historial_Marcial de un Practicante de forma inmutable; las entradas no pueden ser eliminadas, solo marcadas como corregidas con justificación.

---

### Requirement 4: Ranking de Practicantes

**User Story:** Como practicante, quiero conocer mi posición en el ranking de mi categoría, para que pueda medir mi progreso competitivo dentro de la organización.

#### Acceptance Criteria

1. THE Identity_System SHALL calcular el Ranking de cada Practicante dentro de su categoría, definida por la combinación de grado, rango de edad y categoría de peso.
2. WHEN se registra el resultado de una competencia para un Practicante, THE Identity_System SHALL recalcular el Ranking de todos los Practicantes afectados en esa categoría.
3. THE Identity_System SHALL asignar puntos de ranking según el resultado de la competencia: primer lugar 100 puntos, segundo lugar 70 puntos, tercer lugar 50 puntos, participación 10 puntos.
4. WHEN un Practicante consulta su Ranking, THE Identity_System SHALL retornar su posición actual, puntaje total y la cantidad de Practicantes en su categoría.
5. THE Identity_System SHALL publicar un ranking general por categoría accesible para todos los Practicantes autenticados.
6. WHILE un Practicante tiene estado inactivo, THE Identity_System SHALL excluirlo del cálculo y visualización del Ranking activo.
7. THE Identity_System SHALL mantener un historial de posiciones de Ranking por período (mensual y anual) para cada Practicante.

---

### Requirement 5: Certificaciones Digitales

**User Story:** Como practicante, quiero recibir y almacenar mis certificaciones digitales oficiales, para que mis logros sean verificables de forma inmediata por cualquier entidad.

#### Acceptance Criteria

1. THE Identity_System SHALL emitir Certificaciones digitales firmadas con un identificador único, fecha de emisión, tipo de certificación y datos del Practicante.
2. WHEN un Administrador emite una Certificacion para un Practicante, THE Identity_System SHALL asociarla al Perfil del Practicante y notificarle por correo electrónico.
3. THE Identity_System SHALL soportar los siguientes tipos de Certificacion: grado técnico, instructor, árbitro, entrenador y participación en evento.
4. WHEN un Practicante accede a su lista de Certificaciones, THE Identity_System SHALL retornar todas las Certificaciones vigentes ordenadas por fecha de emisión descendente.
5. THE Identity_System SHALL generar una URL pública de verificación para cada Certificacion que permita confirmar su autenticidad sin requerir autenticación.
6. IF una Certificacion es revocada por un Administrador, THEN THE Identity_System SHALL marcarla como revocada con fecha y motivo, y la URL pública de verificación SHALL indicar el estado de revocación.
7. THE Identity_System SHALL preservar el registro de Certificaciones revocadas en el historial del Practicante con fines de auditoría.
8. FOR ALL Certificaciones emitidas, THE Identity_System SHALL garantizar que los datos del Practicante en la Certificacion correspondan al estado del Perfil en el momento de la emisión (propiedad de inmutabilidad del snapshot).

---

### Requirement 6: Verificación mediante Código QR

**User Story:** Como árbitro o instructor, quiero escanear el código QR de un practicante para verificar su identidad y grado en tiempo real, para que la validación presencial sea rápida y confiable.

#### Acceptance Criteria

1. THE Identity_System SHALL generar un QR_Code único para cada Perfil de Practicante en el momento de su creación.
2. WHEN un QR_Code es escaneado, THE Identity_System SHALL retornar el nombre completo, grado actual, estado activo/inactivo y foto de perfil del Practicante sin requerir autenticación del verificador.
3. THE Identity_System SHALL regenerar el QR_Code de un Practicante únicamente cuando un Administrador lo solicite explícitamente.
4. IF el QR_Code escaneado corresponde a un Practicante con estado inactivo, THEN THE Identity_System SHALL indicar claramente el estado inactivo en la respuesta de verificación.
5. THE Identity_System SHALL registrar cada evento de escaneo de QR_Code con marca de tiempo para fines de auditoría, sin almacenar datos del verificador.

---

### Requirement 7: Gestión Administrativa de Practicantes

**User Story:** Como administrador, quiero gestionar el ciclo de vida completo de los practicantes en la plataforma, para que el registro oficial de la organización esté siempre actualizado y sea confiable.

#### Acceptance Criteria

1. THE Identity_System SHALL restringir las operaciones de creación, modificación de grado, emisión de Certificaciones y gestión de Eventos_Marciales exclusivamente a usuarios con rol Administrador.
2. WHEN un Administrador actualiza el grado de un Practicante, THE Identity_System SHALL registrar el cambio en el Historial_Marcial con tipo "examen", fecha y el Administrador que realizó el cambio.
3. WHEN un Administrador desactiva un Practicante, THE Identity_System SHALL cambiar su estado a inactivo y registrar la fecha y motivo de la desactivación.
4. THE Identity_System SHALL permitir a un Administrador buscar Practicantes por nombre, RUT o grado.
5. IF un Administrador intenta asignar un grado inferior al grado actual de un Practicante, THEN THE Identity_System SHALL requerir confirmación explícita con justificación antes de proceder.
6. THE Identity_System SHALL registrar en un log de auditoría todas las acciones realizadas por Administradores, incluyendo el identificador del Administrador, la acción ejecutada y la marca de tiempo.

---

### Requirement 8: Serialización y Persistencia de Datos de Identidad

**User Story:** Como sistema, quiero que los datos de identidad sean serializables y persistibles de forma confiable, para que la integridad de la información se mantenga en todas las operaciones de lectura y escritura.

#### Acceptance Criteria

1. THE Identity_System SHALL serializar y deserializar los datos del Perfil, Historial_Marcial, Ranking y Certificaciones hacia y desde la base de datos sin pérdida de información.
2. FOR ALL objetos Perfil válidos, THE Identity_System SHALL garantizar que serializar y luego deserializar el objeto produzca un objeto equivalente al original (propiedad round-trip).
3. FOR ALL objetos Certificacion válidos, THE Identity_System SHALL garantizar que serializar y luego deserializar el objeto produzca un objeto equivalente al original (propiedad round-trip).
4. WHEN THE Identity_System lee un registro de la base de datos, THE Identity_System SHALL validar que el registro cumple el schema esperado antes de retornarlo a la capa de aplicación.
5. IF un registro de la base de datos no cumple el schema esperado, THEN THE Identity_System SHALL registrar el error en el log del servidor y retornar un error de dominio descriptivo sin exponer detalles internos al cliente.

---

## Nuevos Módulos — Ecosistema Nacional de Kombat Taekwondo Chile

### Requirement 9: Sistema Jerárquico de Roles

**User Story:** Como administrador nacional, quiero definir roles jerárquicos para cada practicante (Alumno, Instructor, Profesor, Maestro) y segmentarlos por edad, para que la estructura organizacional de la disciplina quede reflejada en el sistema.

#### Acceptance Criteria

1. THE Identity_System SHALL asignar a cada Practicante exactamente uno de los siguientes roles jerárquicos: `alumno`, `instructor`, `profesor`, `maestro`.
2. THE Identity_System SHALL clasificar a cada Practicante en exactamente una de las siguientes categorías de edad: `infantil` (hasta 11 años), `juvenil` (12–17 años), `adulto` (18–39 años), `senior` (40 años o más).
3. WHEN un Practicante actualiza su fecha de nacimiento, THE Identity_System SHALL recalcular automáticamente su categoría de edad.
4. THE Identity_System SHALL mantener una línea de maestros para cada Practicante, registrando el identificador del Maestro_Certificador que otorgó cada grado técnico.
5. WHEN un Administrador emite una certificación de grado técnico, THE Identity_System SHALL requerir el identificador del Maestro_Certificador responsable.
6. THE Identity_System SHALL permitir consultar la línea de maestros de un Practicante, retornando la cadena completa de Maestros_Certificadores desde el grado blanco hasta el grado actual.
7. IF el Maestro_Certificador indicado no existe en el sistema o no tiene rol `maestro` o `profesor`, THEN THE Identity_System SHALL rechazar la operación y retornar un mensaje de error descriptivo.
8. THE Identity_System SHALL restringir la promoción al rol `instructor` a Practicantes con grado mínimo cinturón rojo.
9. THE Identity_System SHALL restringir la promoción al rol `profesor` a Practicantes con grado mínimo primer dan de cinturón negro.
10. THE Identity_System SHALL restringir la promoción al rol `maestro` a Practicantes con grado mínimo tercer dan de cinturón negro.

---

### Requirement 10: Red Nacional de Academias

**User Story:** Como administrador nacional, quiero registrar y gestionar las academias oficiales de Kombat Taekwondo en Chile, para que la red de academias sea trazable y verificable.

#### Acceptance Criteria

1. THE Identity_System SHALL registrar cada Academia con nombre oficial, región, ciudad, dirección, estado activo/inactivo y fecha de fundación.
2. THE Identity_System SHALL asignar un identificador único e inmutable a cada Academia en el momento de su registro.
3. THE Identity_System SHALL asociar cada Academia a uno o más Instructores_Responsables, que deben tener rol `instructor`, `profesor` o `maestro`.
4. WHEN un Practicante es registrado, THE Identity_System SHALL permitir asociarlo a una Academia existente.
5. THE Identity_System SHALL permitir a un Practicante pertenecer a una sola Academia activa a la vez.
6. WHEN un Administrador desactiva una Academia, THE Identity_System SHALL cambiar su estado a inactivo y registrar la fecha y motivo de la desactivación.
7. IF se intenta asociar un Practicante a una Academia con estado inactivo, THEN THE Identity_System SHALL rechazar la operación y retornar un mensaje de error descriptivo.
8. THE Identity_System SHALL permitir buscar Academias por nombre, región o ciudad.
9. THE Identity_System SHALL exponer una vista pública de Academias activas con nombre, región, ciudad e Instructores_Responsables, sin exponer datos de contacto privados.
10. WHILE una Academia tiene estado activo, THE Identity_System SHALL mostrar el conteo de Practicantes activos asociados a ella.

---

### Requirement 11: Ranking Internacional

**User Story:** Como practicante, quiero que mis resultados en competencias internacionales sean reconocidos en el ranking, para que mi posición refleje mi desempeño a nivel global.

#### Acceptance Criteria

1. THE Identity_System SHALL clasificar cada Evento_Marcial de tipo competencia como `nacional` o `internacional`.
2. WHEN se registra el resultado de una competencia internacional para un Practicante, THE Identity_System SHALL aplicar un multiplicador de puntos de `1.5x` sobre los puntos base definidos en el Requirement 4.3.
3. THE Identity_System SHALL mantener un ranking internacional separado del ranking nacional, calculado exclusivamente con resultados de competencias clasificadas como `internacional`.
4. THE Identity_System SHALL mantener un ranking combinado que integre puntos nacionales e internacionales para cada Practicante.
5. WHEN un Practicante consulta su ranking, THE Identity_System SHALL retornar su posición en el ranking nacional, en el ranking internacional (si aplica) y en el ranking combinado.
6. THE Identity_System SHALL registrar el país de origen del evento para cada competencia internacional.
7. IF un Practicante no tiene resultados en competencias internacionales, THEN THE Identity_System SHALL retornar posición nula en el ranking internacional sin generar error.
8. THE Identity_System SHALL publicar un ranking combinado por categoría accesible para todos los Practicantes autenticados.

---

### Requirement 12: Sistema Económico

**User Story:** Como administrador, quiero registrar el estado de pago de exámenes, membresías y licencias de cada practicante, para que la gestión económica de la organización esté centralizada y sea trazable.

#### Acceptance Criteria

1. THE Identity_System SHALL registrar los siguientes tipos de cobro: `examen_grado`, `membresia_anual`, `licencia_competencia`.
2. THE Identity_System SHALL asociar cada Cobro a un Practicante con los campos: tipo, monto, moneda (CLP por defecto), estado de pago, fecha de vencimiento y período de vigencia.
3. THE Identity_System SHALL gestionar los siguientes estados de pago: `pendiente`, `pagado`, `vencido`, `exento`.
4. WHEN la fecha actual supera la fecha de vencimiento de un Cobro con estado `pendiente`, THE Identity_System SHALL actualizar automáticamente su estado a `vencido`.
5. THE Identity_System SHALL impedir la emisión de una certificación de grado técnico si el Practicante tiene un Cobro de tipo `examen_grado` con estado `pendiente` o `vencido` para ese examen.
6. WHILE un Practicante tiene una membresía anual con estado `vencido`, THE Identity_System SHALL marcar su Perfil con indicador de membresía vencida visible para Administradores.
7. THE Identity_System SHALL permitir a un Administrador registrar manualmente el pago de un Cobro, actualizando su estado a `pagado` con fecha y referencia de pago.
8. THE Identity_System SHALL permitir a un Administrador marcar un Cobro como `exento` con justificación obligatoria.
9. IF un Administrador intenta emitir una licencia de competencia para un Practicante con membresía anual vencida, THEN THE Identity_System SHALL requerir confirmación explícita antes de proceder.
10. THE Identity_System SHALL generar un resumen de estado económico por Practicante que incluya todos los Cobros activos, vencidos y pendientes.

---

### Requirement 13: Perfil Marcial Extendido

**User Story:** Como practicante, quiero registrar mis grados en múltiples disciplinas de Kombat Taekwondo, para que mi perfil refleje la totalidad de mi trayectoria marcial.

#### Acceptance Criteria

1. THE Identity_System SHALL permitir asociar a un Practicante uno o más registros de Disciplina_Grado, donde cada registro contiene: disciplina, grado actual en esa disciplina, dan (si aplica) y fecha de obtención del grado actual.
2. THE Identity_System SHALL soportar las siguientes disciplinas: `kombat_taekwondo`, `taekwondo_wtf`, `hapkido`, `kick_boxing`, `defensa_personal`.
3. THE Identity_System SHALL garantizar que un Practicante no tenga más de un registro activo de Disciplina_Grado por disciplina.
4. WHEN un Administrador actualiza el grado de un Practicante en una disciplina específica, THE Identity_System SHALL registrar el cambio en el Historial_Marcial con la disciplina afectada.
5. THE Identity_System SHALL mantener un historial de grados por disciplina para cada Practicante, preservando todos los grados anteriores con sus fechas.
6. WHEN un Practicante consulta su perfil, THE Identity_System SHALL mostrar todos sus registros de Disciplina_Grado activos ordenados por disciplina.
7. THE Identity_System SHALL registrar el Maestro_Certificador para cada cambio de grado por disciplina, referenciando el Requirement 9.4.
8. IF se intenta registrar una disciplina no soportada por el sistema, THEN THE Identity_System SHALL rechazar la operación y retornar un mensaje de error descriptivo con la lista de disciplinas válidas.
9. THE Identity_System SHALL calcular el grado principal del Practicante como el grado más alto obtenido en la disciplina `kombat_taekwondo`, manteniendo compatibilidad con el campo `grade` del Requirement 1.2.

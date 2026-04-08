# Manual de Usuario — Kombat Taekwondo

> Sistema de gestión para practicantes, instructores y administradores de la organización Kombat Taekwondo.

---

## Índice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Perfil: Practicante](#2-perfil-practicante)
3. [Perfil: Instructor / Profesor / Maestro](#3-perfil-instructor--profesor--maestro)
4. [Perfil: Administrador](#4-perfil-administrador)
5. [Referencia rápida de campos](#5-referencia-rápida-de-campos)

---

## 1. Acceso al sistema

### 1.1 Iniciar sesión

1. Ingresa a la URL del sistema.
2. Escribe tu **correo electrónico** y **contraseña**.
3. Haz clic en **Ingresar**.
4. Si las credenciales son correctas, serás redirigido a tu dashboard.

> Si ves el mensaje "Bienvenido a Kombat Taekwondo — Tu cuenta está activa pero aún no tienes un perfil de practicante asociado", contacta a un administrador para que vincule tu cuenta.

---

### 1.2 Crear una cuenta

1. En la pantalla de login, haz clic en el enlace **Registrarse**.
2. Completa los campos:
   - **Correo electrónico** — debe ser un correo válido.
   - **Contraseña** — mínimo 8 caracteres.
   - **Confirmar contraseña** — debe coincidir con la anterior.
3. Haz clic en **Crear cuenta**.
4. Revisa tu bandeja de entrada y haz clic en el enlace de confirmación que recibirás por correo.

> Crear una cuenta no genera automáticamente un perfil de practicante. Un administrador debe asociar tu cuenta a un perfil existente.

---

### 1.3 Recuperar contraseña

1. En la pantalla de login, haz clic en **¿Olvidaste tu contraseña?**
2. Escribe tu **correo electrónico** y haz clic en **Enviar enlace de recuperación**.
3. Revisa tu correo (incluyendo la carpeta de spam) y sigue el enlace recibido.

---

### 1.4 Cerrar sesión

Haz clic en el botón **Salir** ubicado en la esquina superior derecha de la barra de navegación.

---

## 2. Perfil: Practicante

Todo usuario autenticado con un perfil de practicante tiene acceso a las siguientes secciones.

---

### 2.1 Dashboard (Inicio)

Al ingresar al sistema verás tu panel personal con:

- **Tarjeta de identidad** — nombre completo, grado actual (con color de cinturón), estado (Activo / Inactivo) y fecha de inicio.
- **4 indicadores clave:**
  - Eventos participados
  - Certificaciones activas
  - Posición en el ranking
  - Puntos acumulados
- **Historial reciente** — las últimas 3 participaciones en eventos.
- **Próximos eventos** — los 3 eventos más cercanos de la organización.
- **Certificaciones** — las 3 certificaciones activas más recientes.
- **Mi ranking** — posición, puntos y barra de progreso dentro de tu categoría.

Cada indicador es un enlace que te lleva a la sección correspondiente.

---

### 2.2 Mi Perfil

Accede desde el menú superior haciendo clic en **Mi Perfil**.

Verás la siguiente información (solo lectura):

| Sección            | Datos mostrados                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Datos personales   | Nombre completo, RUT, fecha de nacimiento, género, grado actual, fecha de inicio, peso, rol |
| Código QR          | Código para verificar tu identidad en eventos o exámenes                                    |
| Contacto           | Email de contacto, teléfono                                                                 |
| Cuenta desactivada | Fecha y motivo de desactivación (solo si aplica)                                            |

> El código QR es personal. Muéstralo cuando un instructor o administrador necesite verificar tu identidad.

---

### 2.3 Historial Marcial

Accede desde el menú superior haciendo clic en **Historial**.

Muestra una tabla con todas tus participaciones en eventos registradas por el administrador:

| Columna   | Descripción                                                               |
| --------- | ------------------------------------------------------------------------- |
| Fecha     | Fecha del evento                                                          |
| Tipo      | Competencia, Seminario o Examen                                           |
| Resultado | Resultado obtenido (si fue registrado)                                    |
| Notas     | Observaciones adicionales                                                 |
| Estado    | **Válido** (registro normal) o **Corregido** (el registro fue modificado) |

> Los registros son ingresados por administradores. Si detectas un error, contacta a tu instructor o al administrador.

---

### 2.4 Ranking

Accede desde el menú superior haciendo clic en **Ranking**.

Verás:

- **Posición actual** — tu lugar dentro de tu categoría (ej. #5 de 32 practicantes).
- **Barra de percentil** — representación visual de tu posición.
- **Puntos totales** acumulados.
- **Categoría** — grado, rango de edad y categoría de peso.
- **Fecha de actualización** del ranking.
- **Historial mensual** — las últimas 6 posiciones mensuales con puntos.

> El ranking se calcula automáticamente a partir de los resultados de competencias registrados en tu historial marcial.

---

### 2.5 Certificaciones

Accede desde el menú superior haciendo clic en **Certificaciones**.

Las certificaciones se muestran en dos grupos:

**Vigentes**

- Tipo de certificación (Grado Técnico, Instructor, Árbitro, Entrenador, Participación en Evento)
- Fecha de emisión
- Notas (si las hay)
- Enlace **Verificar →** para abrir el certificado en una nueva pestaña

**Revocadas**

- Tipo de certificación
- Fecha de emisión y fecha de revocación
- Motivo de revocación

> Las certificaciones son emitidas por administradores. Para solicitar una, contacta a tu instructor.

---

## 3. Perfil: Instructor / Profesor / Maestro

Los instructores tienen acceso a todo lo del perfil Practicante, más el **Panel de Instructor**.

Accede desde el menú superior haciendo clic en **Instructor**.

---

### 3.1 Mis Alumnos

Tabla paginada con todos los practicantes asignados a ti como instructor.

**Columnas:** Nombre, RUT, Grado, Fecha de inscripción, Estado (Activo / Inactivo).

**Acciones disponibles:**

- Haz clic en **Ver** en cualquier fila para ver el perfil completo del alumno.
- Usa los botones de paginación (← Anterior / Siguiente →) para navegar entre páginas de 25 alumnos.

---

### 3.2 Registrar un nuevo alumno

1. En el Panel de Instructor, haz clic en el botón **Registrar alumno**.
2. Completa el formulario:

| Campo               | Obligatorio | Descripción                                     |
| ------------------- | ----------- | ----------------------------------------------- |
| RUT                 | Sí          | Formato: `12345678-9`                           |
| Nombre completo     | Sí          | Nombre y apellidos                              |
| Fecha de nacimiento | Sí          | Selector de fecha                               |
| Género              | Sí          | Masculino / Femenino / Otro                     |
| Grado inicial       | Sí          | Blanco / Amarillo / Verde / Azul / Rojo / Negro |
| Fecha de inicio     | Sí          | Por defecto: hoy                                |
| Peso (kg)           | No          | Ej: `65.5`                                      |
| Ciudad              | No          | Ciudad de residencia                            |

3. Haz clic en **Registrar alumno**.
4. Si el registro es exitoso, verás el mensaje "Alumno registrado exitosamente" y el formulario se limpiará.

**Errores comunes:**

- "Ya existe un practicante con ese RUT" — el RUT ya está registrado en el sistema.
- Campos obligatorios vacíos — el formulario no se enviará hasta completarlos.

> El alumno quedará automáticamente asignado a ti como su instructor.

---

### 3.3 Mis Academias

Grilla de tarjetas con las academias donde eres instructor responsable.

Cada tarjeta muestra: nombre de la academia, ciudad, región y estado (Activa / Inactiva).

Haz clic en **Ver academia →** para acceder al detalle de la academia.

---

### 3.4 Solicitar una certificación para un alumno

1. En el Panel de Instructor, desplázate hasta la sección **Solicitar certificación**.
2. Completa el formulario:

| Campo                 | Obligatorio | Descripción                                 |
| --------------------- | ----------- | ------------------------------------------- |
| Alumno                | Sí          | Selecciona de la lista de alumnos activos   |
| Tipo de certificación | Sí          | Ver tipos disponibles abajo                 |
| Notas                 | No          | Información adicional para el administrador |

**Tipos de certificación disponibles:**

- Grado técnico
- Instructor
- Árbitro
- Entrenador
- Participación en evento

3. Haz clic en **Enviar solicitud**.
4. Si se envió correctamente, verás: "Solicitud enviada correctamente. Un administrador la revisará pronto."

> La solicitud queda en estado **pendiente** hasta que un administrador la apruebe o rechace. No se emite la certificación hasta que sea aprobada.

---

## 4. Perfil: Administrador

Los administradores tienen acceso completo al sistema. Además de todas las funciones anteriores, disponen del **Panel de Administración**.

---

### 4.1 Panel de Administración (Dashboard Admin)

Accede desde el menú superior haciendo clic en **Panel**.

Muestra un resumen general de la organización:

- **4 indicadores:** Total de practicantes, practicantes activos, academias activas, próximos eventos.
- **Distribución por grado** — gráfico de barras con la cantidad de practicantes por color de cinturón.
- **Próximos eventos** — lista de los 5 eventos más cercanos con días restantes.
- **Academias activas** — tabla con nombre, región, ciudad y cantidad de alumnos.

---

### 4.2 Gestión de Practicantes

Accede desde el menú superior haciendo clic en **Practicantes**.

#### Buscar y filtrar practicantes

Usa el panel de filtros en la parte superior de la tabla:

| Filtro   | Descripción                            |
| -------- | -------------------------------------- |
| Nombre   | Búsqueda parcial por nombre            |
| RUT      | Búsqueda parcial por RUT               |
| Grado    | Filtrar por color de cinturón          |
| Academia | Filtrar por academia, o "Sin academia" |

Haz clic en **Buscar** para aplicar los filtros. Haz clic en **Limpiar** para resetearlos.

#### Ordenar la tabla

Haz clic en los encabezados de columna **Nombre**, **Grado**, **Inscripción** o **Creado** para ordenar. Un segundo clic invierte el orden (↑ ascendente / ↓ descendente).

#### Ver el detalle de un practicante

Haz clic en **Ver** en la fila correspondiente.

#### Registrar un nuevo practicante

Haz clic en el botón **+ Registrar nuevo** en la esquina superior derecha.

---

### 4.3 Gestión de Academias

Accede desde el menú superior haciendo clic en **Academias**.

#### Buscar y filtrar academias

| Filtro          | Descripción                 |
| --------------- | --------------------------- |
| Nombre          | Búsqueda parcial por nombre |
| Ciudad / Comuna | Búsqueda parcial por ciudad |
| Región          | Filtrar por región de Chile |
| Estado          | Todas / Activas / Inactivas |

#### Ver el detalle de una academia

Haz clic en **Ver** en la fila correspondiente. Desde el detalle puedes:

**Instructores responsables**

- Ver los instructores actualmente asignados.
- Agregar un instructor disponible desde el selector.
- Quitar un instructor de la academia.

**Practicantes de la academia**

- Tabla paginada (10 por página) con nombre, RUT, grado y ciudad.
- Haz clic en **Ver** para ir al perfil del practicante.
- Haz clic en **Quitar** para remover al practicante de la academia.

**Agregar practicante**

- Selecciona un practicante activo que no pertenezca a ninguna academia.
- Solo aparecen practicantes sin academia activa asignada.

**Desactivar academia**

- En la sección "Zona de peligro", haz clic en el botón de desactivación.
- Esta acción es irreversible desde la interfaz.

#### Registrar una nueva academia

Haz clic en el botón **+ Registrar academia** en la esquina superior derecha.

---

### 4.4 Gestión de Eventos

Accede desde el menú superior haciendo clic en **Eventos**.

#### Buscar eventos

| Filtro | Descripción                              |
| ------ | ---------------------------------------- |
| Nombre | Búsqueda parcial por nombre del evento   |
| Tipo   | Todos / Competencia / Seminario / Examen |

La tabla muestra: nombre, tipo, fecha, lugar y estado (Próximo / Pasado).

#### Crear un nuevo evento

1. Haz clic en **+ Nuevo evento**.
2. Completa el formulario con nombre, tipo, fecha y lugar.
3. Guarda el evento.

#### Ver o editar un evento

Haz clic en **Ver** en la fila correspondiente. Desde el detalle puedes editar la información o eliminar el evento.

---

### 4.5 Solicitudes de Certificación

Accede desde el menú superior haciendo clic en **Solicitudes**.

Muestra todas las solicitudes de certificación **pendientes** enviadas por instructores.

**Columnas:** Instructor solicitante (nombre + RUT), Alumno (nombre + RUT), Tipo de certificación, Notas, Fecha de solicitud.

#### Aprobar una solicitud

1. Localiza la solicitud en la tabla.
2. Haz clic en el botón **Aprobar**.
3. El sistema emitirá automáticamente la certificación al alumno y marcará la solicitud como aprobada.

#### Rechazar una solicitud

1. Localiza la solicitud en la tabla.
2. Haz clic en el botón **Rechazar**.
3. Opcionalmente, ingresa un motivo de rechazo.
4. La solicitud quedará marcada como rechazada.

> Una vez aprobada, la certificación aparecerá en el perfil del alumno bajo la sección **Certificaciones**.

---

### 4.6 Gestión Económica (Cobros)

Accede desde el menú superior haciendo clic en **Cobros** (si está disponible en tu navegación).

#### Resumen general

En la parte superior verás 3 indicadores:

- **Cobros pendientes** — total de cobros en estado "pendiente" en toda la organización.
- **Cobros vencidos** — total de cobros en estado "vencido".
- **Practicantes con deuda** — cantidad de practicantes con al menos un cobro pendiente o vencido.

#### Tabla de practicantes

Muestra todos los practicantes con el conteo de cobros pendientes y vencidos. Los valores se destacan en color cuando son mayores a cero:

- Pendientes: color ámbar
- Vencidos: color rojo

#### Ver cobros de un practicante

Haz clic en **Ver cobros** en la fila del practicante para acceder al detalle de todos sus cobros con estado individual.

---

## 5. Referencia rápida de campos

### Grados (cinturones)

| Valor  | Etiqueta            |
| ------ | ------------------- |
| white  | Blanco              |
| yellow | Amarillo            |
| green  | Verde               |
| blue   | Azul                |
| red    | Rojo                |
| black  | Negro (+ nivel Dan) |

### Tipos de evento

| Valor       | Etiqueta    |
| ----------- | ----------- |
| competition | Competencia |
| seminar     | Seminario   |
| exam        | Examen      |

### Tipos de certificación

| Valor               | Etiqueta                |
| ------------------- | ----------------------- |
| technical_grade     | Grado Técnico           |
| instructor          | Instructor              |
| referee             | Árbitro                 |
| coach               | Entrenador              |
| event_participation | Participación en Evento |

### Estados de cobro

| Valor     | Etiqueta  |
| --------- | --------- |
| pendiente | Pendiente |
| pagado    | Pagado    |
| vencido   | Vencido   |

### Categorías de ranking por edad

| Valor    | Etiqueta   |
| -------- | ---------- |
| under-12 | Sub-12     |
| 12-17    | 12–17 años |
| 18-30    | 18–30 años |
| 30+      | 30+ años   |

### Categorías de ranking por peso

| Valor   | Etiqueta |
| ------- | -------- |
| fin     | Fin      |
| fly     | Fly      |
| bantam  | Bantam   |
| feather | Pluma    |
| light   | Ligero   |
| welter  | Welter   |
| middle  | Medio    |
| heavy   | Pesado   |

---

## Preguntas frecuentes

**¿Por qué no veo el menú de Instructor?**
El menú de Instructor solo aparece si tu perfil tiene el rol `instructor`, `profesor` o `maestro`. Contacta a un administrador si crees que debería aparecer.

**¿Por qué no veo el Panel de Administración?**
El acceso al panel de administración requiere estar registrado en la tabla de administradores del sistema. Contacta al administrador principal.

**¿Puedo editar mi perfil?**
Los datos del perfil son administrados por el equipo de administración. Si necesitas actualizar información, contacta a tu instructor o al administrador.

**¿Cómo se calcula el ranking?**
El ranking se calcula automáticamente a partir de los resultados de competencias registrados en tu historial marcial. Se actualiza periódicamente.

**¿Qué significa "Corregido" en el historial?**
Indica que un administrador modificó ese registro después de su creación original. El dato actual es el correcto.

**¿Cómo verifico una certificación?**
Cada certificación vigente tiene un enlace **Verificar →** que abre una página pública de verificación. También puedes acceder directamente a `/verify/cert/[id]`.

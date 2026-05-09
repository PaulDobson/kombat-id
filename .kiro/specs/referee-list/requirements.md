# Documento de Requisitos: Listado Público de Árbitros (`referee-list`)

## Introducción

El feature `referee-list` agrega una página pública dentro del panel de administración que muestra todos los árbitros con estado `approved` registrados en el sistema. La página presenta una experiencia visual con tarjetas individuales que muestran el nombre del árbitro, su país, número de registro oficial y fecha de afiliación. La página es de solo lectura, no requiere mutaciones, y es accesible únicamente para usuarios autenticados con rol admin.

El feature reutiliza íntegramente el bounded context `src/modules/referee-registration/` existente: la entidad `RefereeRegistration`, la interfaz `RefereeRegistrationRepository`, el caso de uso `listRefereeRegistrations`, y el repositorio `SupabaseRefereeRegistrationRepository`. No se crea ningún módulo nuevo ni se modifica la base de datos.

---

## Glosario

- **Page**: Server Component ubicado en `app/(dashboard)/admin/referees/page.tsx` que actúa como punto de entrada de la ruta `/admin/referees`.
- **RefereeGrid**: Server Component que recibe un array de `RefereeListItem[]` y renderiza el grid responsivo de tarjetas.
- **RefereeCard**: Server Component que renderiza la tarjeta visual de un árbitro individual.
- **RefereeListItem**: DTO serializable que contiene únicamente los campos necesarios para la UI: `id`, `fullName`, `country`, `registrationNumber`, `approvedAt`.
- **RefereeRegistration**: Entidad de dominio existente en `src/modules/referee-registration/domain/entities/refereeRegistration.ts`.
- **RefereeRegistrationRepository**: Interfaz de repositorio existente en `src/modules/referee-registration/domain/interfaces/refereeRegistrationRepository.ts`.
- **listRefereeRegistrations**: Caso de uso existente en `src/modules/referee-registration/application/use-cases/listRefereeRegistrations.ts`.
- **SupabaseRefereeRegistrationRepository**: Implementación concreta del repositorio existente en `src/modules/referee-registration/infrastructure/repositories/supabaseRefereeRegistrationRepository.ts`.
- **requireAdminUser**: Guard de autenticación y autorización que verifica sesión activa y rol admin; redirige si la verificación falla.
- **formatDateLong**: Función utilitaria en `src/lib/format-date.ts` que formatea un ISO timestamp al patrón `"D de [mes] de YYYY"` en español.
- **DashboardNav**: Componente de navegación del panel admin ubicado en `src/app/(dashboard)/_components/DashboardNav.tsx`.
- **Sistema**: El conjunto de componentes del feature `referee-list` (Page, RefereeGrid, RefereeCard) operando sobre el bounded context `referee-registration`.

---

## Requisitos

### Requisito 1: Acceso y autorización a la página de árbitros

**User Story:** Como administrador, quiero que la página de árbitros esté protegida por autenticación y autorización, para que solo los administradores autenticados puedan ver el listado de árbitros oficiales.

#### Criterios de aceptación

1. WHEN un usuario no autenticado realiza una solicitud GET a `/admin/referees`, THEN THE Page SHALL redirigir al usuario a `/login` sin renderizar ningún dato de árbitros.
2. WHEN un usuario autenticado sin rol admin realiza una solicitud GET a `/admin/referees`, THEN THE Page SHALL redirigir al usuario a `/dashboard` sin renderizar ningún dato de árbitros.
3. WHEN un usuario autenticado con rol admin realiza una solicitud GET a `/admin/referees`, THEN THE Page SHALL invocar `requireAdminUser()` como primera operación, antes de cualquier acceso a datos o renderizado de contenido.
4. WHEN un usuario autenticado con rol admin realiza una solicitud GET a `/admin/referees`, THEN THE Page SHALL renderizar el listado de registros cuyo `status === "approved"` en la base de datos.

---

### Requisito 2: Obtención y filtrado de árbitros aprobados

**User Story:** Como administrador, quiero ver únicamente los árbitros con estado aprobado, para que el listado refleje solo los árbitros oficiales activos del sistema.

#### Criterios de aceptación

1. WHEN la Page carga los datos, THE Page SHALL invocar `listRefereeRegistrations` con el filtro `{ status: "approved", pageSize: 200 }` utilizando una instancia de `SupabaseRefereeRegistrationRepository`.
2. WHEN `listRefereeRegistrations` retorna resultados, THE Page SHALL serializar cada `RefereeRegistration` al DTO `RefereeListItem` incluyendo únicamente los campos `id`, `fullName`, `country`, `registrationNumber` y `approvedAt`.
3. IF la serialización de una `RefereeRegistration` a `RefereeListItem` se ejecuta, THEN THE Page SHALL excluir estructuralmente los campos `email`, `authUserId`, `certificatePath`, `approvedBy`, `rejectedAt` y `rejectedBy` del DTO resultante.
4. THE Page SHALL pasar el array de `RefereeListItem[]` resultante al componente `RefereeGrid` como prop serializable.

---

### Requisito 3: Encabezado de la página con contador y búsqueda

**User Story:** Como administrador, quiero ver un encabezado informativo con el total de árbitros y un campo de búsqueda, para que pueda orientarme rápidamente sobre el contenido de la página y filtrar por nombre.

#### Criterios de aceptación

1. THE Page SHALL renderizar un encabezado con el título `"Árbitros Oficiales"` y la descripción `"Registro oficial de árbitros de Kombat Taekwondo Chile"`.
2. THE Page SHALL renderizar un contador numérico cuyo valor sea igual al número total de registros con `status === "approved"` retornados por el caso de uso, independientemente de cualquier filtro de búsqueda activo.
3. THE Page SHALL renderizar un campo de búsqueda que acepta el query param `?search=` para filtrar árbitros por nombre.
4. WHEN el query param `search` está presente y no es una cadena vacía, THEN THE Page SHALL pasar su valor al componente de grid para que aplique el filtro por nombre.
5. WHEN el query param `search` está ausente o es una cadena vacía, THEN THE Page SHALL renderizar el grid sin ningún filtro de nombre aplicado.
6. WHEN el query param `search` produce cero coincidencias, THEN THE Page SHALL renderizar un estado vacío indicando que no se encontraron árbitros para la búsqueda, sin ocultar el contador total del encabezado.

---

### Requisito 4: Grid responsivo de tarjetas de árbitros

**User Story:** Como administrador, quiero ver los árbitros organizados en un grid responsivo, para que la página sea usable en dispositivos de distintos tamaños de pantalla.

#### Criterios de aceptación

1. WHEN el componente de grid recibe un array de árbitros no vacío, THEN THE RefereeGrid SHALL renderizar exactamente una tarjeta por cada elemento del array.
2. THE RefereeGrid SHALL aplicar un layout de grid con 1 columna en mobile (< 640 px), 2 columnas en tablet (≥ 640 px), 3 columnas en desktop (≥ 1024 px) y 4 columnas en pantallas anchas (≥ 1280 px).
3. WHEN el componente de grid recibe un array de árbitros vacío, THEN THE RefereeGrid SHALL renderizar un estado vacío con el mensaje `"No hay árbitros registrados"` y la descripción `"Aún no se han aprobado registros de árbitros."` en lugar del grid.
4. WHEN el componente de grid recibe un filtro de búsqueda no vacío, THEN THE RefereeGrid SHALL mostrar únicamente las tarjetas cuyo nombre completo contiene el valor del filtro (comparación case-insensitive).
5. WHEN el filtro de búsqueda es una cadena vacía o está ausente, THEN THE RefereeGrid SHALL mostrar todas las tarjetas sin aplicar ningún filtro.
6. WHEN el filtro de búsqueda produce cero coincidencias en un array no vacío, THEN THE RefereeGrid SHALL renderizar el estado vacío con el mensaje `"No hay árbitros registrados"` en lugar del grid.

---

### Requisito 5: Tarjeta individual de árbitro

**User Story:** Como administrador, quiero ver la información de cada árbitro en una tarjeta visual clara, para que pueda identificar rápidamente a cada árbitro oficial y sus datos relevantes.

#### Criterios de aceptación

1. WHEN la tarjeta recibe los datos de un árbitro, THEN THE RefereeCard SHALL renderizar el nombre completo del árbitro con clase `font-semibold text-lg text-neutral-50`.
2. THE RefereeCard SHALL renderizar el país del árbitro acompañado de un ícono de globo (🌎 o equivalente SVG).
3. THE RefereeCard SHALL renderizar el número de registro oficial con clase `font-mono` (estilo monoespaciado).
4. WHEN el campo `approvedAt` del árbitro es un ISO timestamp válido, THEN THE RefereeCard SHALL invocar `formatDateLong(approvedAt)` y mostrar el resultado con el prefijo `"Afiliado el"`.
5. WHEN el campo `approvedAt` del árbitro es `null` o `undefined`, THEN THE RefereeCard SHALL mostrar `"Afiliado el —"` sin lanzar una excepción.
6. THE RefereeCard SHALL renderizar un avatar circular cuyo contenido son las iniciales del árbitro: la primera letra del primer nombre y la primera letra del primer apellido (separados por espacio), en mayúsculas, con fondo de gradiente `from-primary-600 to-primary-800`.
7. THE RefereeCard SHALL renderizar un badge con el texto `"Árbitro Oficial"` con clases `bg-primary-900/50 text-primary-400 border border-primary-800`.
8. THE RefereeCard SHALL aplicar las clases `bg-neutral-900 border border-neutral-800` como estilo base y `hover:border-primary-500/50 hover:bg-neutral-800/60` como estado hover.

---

### Requisito 6: Formato de fecha de afiliación

**User Story:** Como administrador, quiero ver la fecha de afiliación de cada árbitro en un formato legible en español, para que pueda interpretar la información sin ambigüedad.

#### Criterios de aceptación

1. WHEN `formatDateLong` recibe un string con prefijo `YYYY-MM-DD` válido (incluyendo ISO 8601 completo como `"2025-01-05T00:00:00Z"`), THEN THE formatDateLong SHALL retornar un string no vacío con el patrón `"D de [mes] de YYYY"` donde `D` es el día sin cero inicial y `[mes]` es el nombre del mes en español en minúsculas (ej: `"enero"`, `"febrero"`, ..., `"diciembre"`).
2. IF `formatDateLong` recibe `null`, `undefined` o una cadena vacía `""`, THEN THE formatDateLong SHALL retornar el literal `"—"` sin lanzar una excepción.

---

### Requisito 7: Navegación hacia la página de árbitros

**User Story:** Como administrador, quiero acceder a la lista de árbitros desde el menú de navegación del panel admin, para que pueda llegar a la página sin necesidad de escribir la URL manualmente.

#### Criterios de aceptación

1. IF el usuario autenticado tiene rol admin, THEN THE DashboardNav SHALL incluir un enlace con el texto `"Lista de árbitros"` en la sección de navegación admin, reemplazando el enlace existente `"Árbitros"` que apunta a `/admin/referee-registrations`.
2. THE DashboardNav SHALL configurar el nuevo enlace de árbitros con el destino `/admin/referees`.

---

### Requisito 8: Restricción de componentes a Server Components

**User Story:** Como desarrollador, quiero que todos los componentes del feature sean Server Components, para que no se genere JavaScript innecesario en el cliente y se mantenga la seguridad de los datos.

#### Criterios de aceptación

1. THE Page SHALL ser declarada como `export default async function` sin la directiva `"use client"` y sin el uso de hooks de React (`useState`, `useEffect`, `useReducer`, `useRef`, etc.).
2. THE RefereeGrid SHALL ser declarado sin la directiva `"use client"` y sin el uso de hooks de React.
3. THE RefereeCard SHALL ser declarado sin la directiva `"use client"` y sin el uso de hooks de React.
4. THE SupabaseRefereeRegistrationRepository SHALL contener `import "server-only"` como primera sentencia de importación del archivo, para prevenir importaciones accidentales desde Client Components.

---

## Propiedades de corrección

_Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquinas._

### Propiedad 1: Solo árbitros aprobados en el listado

_Para cualquier_ conjunto de registros en la base de datos con estados mixtos (`pending`, `approved`, `rejected`), el array `RefereeListItem[]` producido por la Page debe contener únicamente registros cuyo `status` original era `"approved"`. Ningún registro con `status === "pending"` o `status === "rejected"` debe aparecer en el resultado.

**Valida: Requisitos 2.1, 2.2**

---

### Propiedad 2: Serialización segura del DTO

_Para cualquier_ `RefereeRegistration` válida con `status === "approved"`, la conversión a `RefereeListItem` debe excluir estructuralmente los campos sensibles `email`, `authUserId`, `certificatePath`, `approvedBy`, `rejectedAt` y `rejectedBy`. El DTO resultante debe contener únicamente `id`, `fullName`, `country`, `registrationNumber` y `approvedAt`.

**Valida: Requisitos 2.2, 2.3**

---

### Propiedad 3: Invariante de conteo entre encabezado y grid

_Para cualquier_ estado de la base de datos, el valor numérico mostrado en el contador del encabezado de la Page debe ser igual al número de instancias de `RefereeCard` renderizadas en el `RefereeGrid`.

**Valida: Requisito 3.2**

---

### Propiedad 4: Correspondencia 1:1 entre array y tarjetas renderizadas

_Para cualquier_ array `RefereeListItem[]` de longitud N pasado a `RefereeGrid`, el componente debe renderizar exactamente N instancias de `RefereeCard`, una por cada elemento del array.

**Valida: Requisito 4.1**

---

### Propiedad 5: Filtrado de búsqueda es subconjunto correcto

_Para cualquier_ query de búsqueda no vacío y cualquier array de `RefereeListItem[]`, todos los elementos mostrados por `RefereeGrid` deben tener un `fullName` que contiene el query (case-insensitive), y ningún elemento cuyo `fullName` no contenga el query debe aparecer en el resultado.

**Valida: Requisito 4.4**

---

### Propiedad 6: Formato de fecha de afiliación

_Para cualquier_ ISO timestamp válido en `approvedAt`, la función `formatDateLong(approvedAt)` debe retornar un string no vacío que coincide con el patrón `"D de [mes] de YYYY"` donde `[mes]` es uno de los 12 nombres de mes en español.

**Valida: Requisito 6.1**

---

### Propiedad 7: Autorización obligatoria para cualquier solicitud

_Para cualquier_ solicitud HTTP a `/admin/referees`, si el usuario no está autenticado o no tiene rol admin, el sistema debe redirigir sin renderizar ningún dato de árbitros. Esta propiedad debe mantenerse independientemente del estado de la base de datos.

**Valida: Requisitos 1.1, 1.2, 1.3**

# Documento de Requisitos: Sección Pública de Árbitros (`public-referee-section`)

## Introducción

El feature `public-referee-section` agrega una nueva sección a la landing page (`src/app/page.tsx`) que muestra todos los árbitros con estado `approved` en un grid visual de tarjetas, accesible sin autenticación. La sección incluye un campo de búsqueda por nombre implementado con un formulario nativo `<form method="GET">` y el query param `?search=`, sin necesidad de `"use client"`.

El feature reutiliza íntegramente los componentes y la lógica ya existentes en el bounded context `src/modules/referee-registration/`: el DTO `RefereeListItem`, la función `toRefereeListItem`, el componente `RefereeCard`, el componente `RefereeGrid`, el caso de uso `listRefereeRegistrations` y el repositorio `SupabaseRefereeRegistrationRepository`. No se crea ningún módulo nuevo ni se modifica la base de datos.

El diseño visual sigue el dark theme de la landing page existente, usando las paletas `neutral-*` y `primary-*` de Tailwind CSS, y el patrón de sección establecido por las secciones "Próximas actividades" y "Funcionalidades".

---

## Glosario

- **LandingPage**: Server Component ubicado en `src/app/page.tsx` que actúa como punto de entrada de la ruta `/`.
- **PublicRefereesSection**: Bloque de JSX dentro de `LandingPage` que renderiza el encabezado, el campo de búsqueda y el `RefereeGrid` con los árbitros aprobados.
- **getApprovedReferees**: Función `async` declarada en `src/app/page.tsx` que instancia `SupabaseRefereeRegistrationRepository`, invoca `listRefereeRegistrations` con el filtro `{ status: "approved" }` y retorna un array de `RefereeListItem[]`.
- **RefereeGrid**: Server Component existente en `src/modules/referee-registration/presentation/components/RefereeGrid.tsx` que recibe `referees: RefereeListItem[]` y `searchQuery?: string` y renderiza el grid responsivo de tarjetas.
- **RefereeCard**: Server Component existente en `src/modules/referee-registration/presentation/components/RefereeCard.tsx` que renderiza la tarjeta visual de un árbitro individual.
- **RefereeListItem**: DTO serializable existente en `src/modules/referee-registration/presentation/components/refereeListItem.ts` con los campos `id`, `fullName`, `country`, `registrationNumber` y `approvedAt`.
- **toRefereeListItem**: Función existente que mapea una `RefereeRegistration` a un `RefereeListItem`.
- **listRefereeRegistrations**: Caso de uso existente en `src/modules/referee-registration/application/use-cases/listRefereeRegistrations.ts`.
- **SupabaseRefereeRegistrationRepository**: Implementación concreta del repositorio existente en `src/modules/referee-registration/infrastructure/repositories/supabaseRefereeRegistrationRepository.ts`.
- **adminSupabase**: Cliente Supabase con service role utilizado por la landing page para consultas públicas sin autenticación de usuario.
- **Sistema**: El conjunto formado por `LandingPage`, `getApprovedReferees`, `RefereeGrid` y `RefereeCard` operando sobre el bounded context `referee-registration`.

---

## Requisitos

### Requisito 1: Sección pública de árbitros en la landing page

**User Story:** Como visitante del sitio, quiero ver una sección con todos los árbitros oficiales aprobados en la landing page, para que pueda conocer quiénes son los árbitros certificados de Kombat Taekwondo Chile sin necesidad de crear una cuenta.

#### Criterios de aceptación

1. THE LandingPage SHALL renderizar la sección `PublicRefereesSection` como parte del flujo de contenido de la página, después de la sección de próximas actividades y antes del CTA final.
2. THE LandingPage SHALL renderizar la sección `PublicRefereesSection` sin requerir ninguna sesión activa ni verificación de autenticación.
3. WHEN un visitante no autenticado realiza una solicitud GET a `/`, THEN THE LandingPage SHALL renderizar la sección de árbitros con los datos de árbitros aprobados obtenidos de la base de datos.
4. THE LandingPage SHALL declarar la función `getApprovedReferees` como función `async` sin la directiva `"use client"` y sin el uso de hooks de React.

---

### Requisito 2: Obtención de árbitros aprobados

**User Story:** Como visitante del sitio, quiero ver únicamente los árbitros con estado aprobado, para que el listado refleje solo los árbitros oficiales activos del sistema.

#### Criterios de aceptación

1. WHEN la LandingPage carga los datos de árbitros, THE getApprovedReferees SHALL invocar `listRefereeRegistrations` con el filtro `{ status: "approved" }` utilizando una instancia de `SupabaseRefereeRegistrationRepository`.
2. WHEN `listRefereeRegistrations` retorna resultados, THE getApprovedReferees SHALL serializar cada `RefereeRegistration` al DTO `RefereeListItem` utilizando la función `toRefereeListItem`.
3. THE getApprovedReferees SHALL retornar únicamente los registros cuyo `status` original era `"approved"` — ningún registro con `status === "pending"` o `status === "rejected"` debe aparecer en el array resultante.
4. THE LandingPage SHALL pasar el array de `RefereeListItem[]` resultante al componente `RefereeGrid` como prop serializable.

---

### Requisito 3: Encabezado de la sección con contador y etiqueta

**User Story:** Como visitante del sitio, quiero ver un encabezado informativo con el total de árbitros aprobados, para que pueda orientarme sobre el contenido de la sección antes de explorarla.

#### Criterios de aceptación

1. THE PublicRefereesSection SHALL renderizar un encabezado con el título `"Árbitros Oficiales"`.
2. THE PublicRefereesSection SHALL renderizar una descripción con el texto `"Árbitros certificados de Kombat Taekwondo Chile"`.
3. THE PublicRefereesSection SHALL renderizar una etiqueta de sección con el texto `"Directorio"`, consistente con el patrón de etiquetas de las demás secciones de la landing page (clase `inline-flex` con fondo `bg-neutral-800 border border-neutral-700`).
4. THE PublicRefereesSection SHALL renderizar un contador numérico cuyo valor sea igual al número total de registros con `status === "approved"` retornados por `getApprovedReferees`, independientemente de cualquier filtro de búsqueda activo.
5. WHEN el query param `search` está presente y no es una cadena vacía, THEN THE PublicRefereesSection SHALL mantener el valor del contador igual al total de árbitros aprobados, sin reducirlo al número de coincidencias del filtro.

---

### Requisito 4: Campo de búsqueda por nombre

**User Story:** Como visitante del sitio, quiero buscar árbitros por nombre, para que pueda encontrar rápidamente a un árbitro específico sin recorrer toda la lista.

#### Criterios de aceptación

1. THE PublicRefereesSection SHALL renderizar un campo de búsqueda implementado como `<form method="GET">` con un `<input name="search">` que envía el valor como query param `?search=` en la URL.
2. THE PublicRefereesSection SHALL implementar el campo de búsqueda sin la directiva `"use client"` y sin el uso de hooks de React (`useState`, `useEffect`, etc.).
3. WHEN el query param `search` está presente y no es una cadena vacía, THEN THE LandingPage SHALL pasar su valor al prop `searchQuery` del componente `RefereeGrid`.
4. WHEN el query param `search` está ausente o es una cadena vacía, THEN THE LandingPage SHALL renderizar el `RefereeGrid` sin pasar el prop `searchQuery` (o pasando `undefined`).
5. WHEN el query param `search` contiene un valor, THEN THE PublicRefereesSection SHALL pre-poblar el campo de búsqueda con ese valor como `defaultValue` del input.
6. WHEN el query param `search` produce cero coincidencias, THEN THE RefereeGrid SHALL renderizar el estado vacío sin ocultar el contador total del encabezado.

---

### Requisito 5: Grid responsivo de tarjetas de árbitros

**User Story:** Como visitante del sitio, quiero ver los árbitros organizados en un grid responsivo de tarjetas, para que la sección sea usable en dispositivos de distintos tamaños de pantalla.

#### Criterios de aceptación

1. THE PublicRefereesSection SHALL pasar el array de `RefereeListItem[]` al componente `RefereeGrid` existente sin modificar su implementación.
2. WHEN el `RefereeGrid` recibe un array de árbitros no vacío, THEN THE RefereeGrid SHALL renderizar exactamente una instancia de `RefereeCard` por cada elemento del array.
3. THE RefereeGrid SHALL aplicar un layout de grid con 1 columna en mobile (< 640 px), 2 columnas en tablet (≥ 640 px), 3 columnas en desktop (≥ 1024 px) y 4 columnas en pantallas anchas (≥ 1280 px).
4. WHEN el `RefereeGrid` recibe un array vacío o el filtro de búsqueda produce cero coincidencias, THEN THE RefereeGrid SHALL renderizar un estado vacío con el mensaje `"No hay árbitros registrados"`.

---

### Requisito 6: Consistencia visual con la landing page

**User Story:** Como visitante del sitio, quiero que la sección de árbitros tenga el mismo estilo visual que el resto de la landing page, para que la experiencia sea coherente y profesional.

#### Criterios de aceptación

1. THE PublicRefereesSection SHALL aplicar `border-t border-neutral-800 bg-neutral-900/20` como estilo base del contenedor de sección, consistente con las secciones "Próximas actividades" y "Funcionalidades" de la landing page.
2. THE PublicRefereesSection SHALL aplicar `max-w-7xl mx-auto px-6 py-20 sm:py-24` al contenedor interior, consistente con el espaciado de las demás secciones.
3. THE RefereeCard SHALL aplicar `bg-neutral-900 border border-neutral-800` como estilo base y `hover:border-primary-500/50 hover:bg-neutral-800/60` como estado hover.
4. THE PublicRefereesSection SHALL renderizar el título de la sección con la clase `text-3xl font-bold tracking-tight`, consistente con los títulos `h2` de las demás secciones de la landing page.

---

### Requisito 7: Integración con el flujo de datos de la landing page

**User Story:** Como desarrollador, quiero que la obtención de datos de árbitros siga el mismo patrón que la obtención de eventos de la landing page, para que el código sea consistente y mantenible.

#### Criterios de aceptación

1. THE LandingPage SHALL invocar `getApprovedReferees` en paralelo con `getUpcomingEvents` utilizando `Promise.all()`, para evitar waterfalls de red secuenciales.
2. THE getApprovedReferees SHALL utilizar `adminSupabase` a través de `SupabaseRefereeRegistrationRepository`, siguiendo el mismo patrón de acceso a datos que `getUpcomingEvents`.
3. THE LandingPage SHALL leer el query param `search` desde `searchParams` (prop de la página) y pasarlo a `getApprovedReferees` o directamente al `RefereeGrid`.
4. THE LandingPage SHALL declarar `searchParams: Promise<{ search?: string }>` como prop de la función de página, siguiendo el patrón de Next.js App Router para query params en Server Components.

---

### Requisito 8: Restricción de componentes a Server Components

**User Story:** Como desarrollador, quiero que todos los componentes de la sección sean Server Components, para que no se genere JavaScript innecesario en el cliente y la página mantenga su rendimiento.

#### Criterios de aceptación

1. THE LandingPage SHALL mantener su declaración como `export default async function` sin la directiva `"use client"` y sin el uso de hooks de React.
2. THE RefereeGrid SHALL ser utilizado sin la directiva `"use client"` y sin el uso de hooks de React.
3. THE RefereeCard SHALL ser utilizado sin la directiva `"use client"` y sin el uso de hooks de React.
4. THE getApprovedReferees SHALL acceder a `SupabaseRefereeRegistrationRepository` únicamente desde código de servidor, sin exponer credenciales ni lógica de acceso a datos al cliente.

---

## Propiedades de corrección

_Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema._

### Propiedad 1: Solo árbitros aprobados en la sección pública

_Para cualquier_ conjunto de registros en la base de datos con estados mixtos (`pending`, `approved`, `rejected`), el array `RefereeListItem[]` producido por `getApprovedReferees` debe contener únicamente registros cuyo `status` original era `"approved"`. Ningún registro con `status === "pending"` o `status === "rejected"` debe aparecer en el resultado.

**Valida: Requisitos 2.1, 2.2, 2.3**

---

### Propiedad 2: Filtrado de búsqueda es subconjunto correcto

_Para cualquier_ query de búsqueda no vacío y cualquier array de `RefereeListItem[]`, todos los elementos mostrados por `RefereeGrid` deben tener un `fullName` que contiene el query (comparación case-insensitive), y ningún elemento cuyo `fullName` no contenga el query debe aparecer en el resultado.

**Valida: Requisitos 4.3, 4.4**

---

### Propiedad 3: Invariante del contador respecto al filtro de búsqueda

_Para cualquier_ valor del query param `search`, el contador numérico mostrado en el encabezado de `PublicRefereesSection` debe ser igual al número total de árbitros aprobados retornados por `getApprovedReferees`, independientemente del número de coincidencias que produzca el filtro de búsqueda activo.

**Valida: Requisitos 3.4, 3.5**

---

### Propiedad 4: Correspondencia 1:1 entre array y tarjetas renderizadas

_Para cualquier_ array `RefereeListItem[]` de longitud N pasado a `RefereeGrid` (sin filtro de búsqueda activo), el componente debe renderizar exactamente N instancias de `RefereeCard`, una por cada elemento del array.

**Valida: Requisito 5.2**

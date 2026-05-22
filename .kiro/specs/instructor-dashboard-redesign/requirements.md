# Requirements Document

## Introduction

Rediseño del dashboard del instructor (`/instructor`) como una página única de alto impacto visual. La página mantiene el data fetching en el Server Component `page.tsx` y delega toda la interactividad a Client Components. El nuevo layout incluye una fila de KPIs con 4 tarjetas métricas, seguida de un sistema de tabs client-side (Academias / Alumnos / Solicitudes). La pestaña Solicitudes muestra el historial de solicitudes de certificación en modo solo lectura y expone un botón "Nueva solicitud" que abre el formulario de certificación dentro de un modal Radix Dialog. El diseño aplica dark theme consistente con la paleta `neutral-950/900/800` y acentos `primary-*`.

## Glossary

- **InstructorDashboard**: La página Server Component ubicada en `src/app/(dashboard)/instructor/page.tsx` que orquesta el data fetching y compone el layout.
- **KPIRow**: Componente Client Component que renderiza 4 tarjetas de métricas clave derivadas de los datos del instructor.
- **DashboardTabs**: Componente Client Component que implementa la navegación por pestañas usando `@radix-ui/react-tabs`, sin recargar la página.
- **AcademyTab**: Pestaña que contiene el contenido refactorizado de `AcademySection`.
- **StudentTab**: Pestaña que contiene el contenido refactorizado de `StudentSection`.
- **SolicitudesTab**: Pestaña que muestra el historial de solicitudes de certificación en modo solo lectura y el botón "Nueva solicitud".
- **CertificationRequestModal**: Modal Radix Dialog que contiene el formulario `RequestCertificationForm` para crear nuevas solicitudes de certificación.
- **KPIData**: Objeto serializable con los campos `totalStudents`, `activeAcademies`, `pendingRequests`, `observedRequests` calculados en el Server Component.
- **ActiveAcademy**: Academia cuyo campo `is_active` es `true`.
- **PendingRequest**: Solicitud de certificación cuyo campo `status` es `"pending"`.
- **ObservedRequest**: Solicitud de certificación cuyo campo `status` es `"observed"`.

## Requirements

### Requirement 1: KPI Row

**User Story:** Como instructor, quiero ver un resumen visual de mis métricas clave al abrir el dashboard, para tener una visión rápida del estado de mi actividad.

#### Acceptance Criteria

1. THE `InstructorDashboard` SHALL compute `KPIData` a partir de los datos ya obtenidos en el Server Component, sin ejecutar consultas adicionales a la base de datos.
2. THE `InstructorDashboard` SHALL pasar `KPIData` como prop serializable al `KPIRow`.
3. THE `KPIRow` SHALL renderizar exactamente 4 tarjetas en el siguiente orden: total de alumnos, academias activas, solicitudes pendientes, solicitudes observadas.
4. WHEN `KPIData.activeAcademies` es calculado, THE `InstructorDashboard` SHALL contar únicamente las academias cuyo campo `is_active` es `true`.
5. WHEN `KPIData.pendingRequests` es calculado, THE `InstructorDashboard` SHALL contar únicamente las solicitudes cuyo campo `status` es `"pending"`.
6. WHEN `KPIData.observedRequests` es calculado, THE `InstructorDashboard` SHALL contar únicamente las solicitudes cuyo campo `status` es `"observed"`.
7. THE `KPIRow` SHALL aplicar el dark theme con fondo `bg-neutral-900`, borde `border-neutral-700` y texto de valor con color `primary-*` o `neutral-50`.

### Requirement 2: Tabs Client-Side

**User Story:** Como instructor, quiero navegar entre mis academias, alumnos y solicitudes mediante pestañas sin recargar la página, para tener una experiencia fluida y rápida.

1. THE `DashboardTabs` SHALL implementar la navegación usando `@radix-ui/react-tabs` con tres pestañas: "Academias", "Alumnos" y "Solicitudes".
2. WHEN la página carga por primera vez, THE `DashboardTabs` SHALL mostrar la pestaña "Academias" como pestaña activa por defecto.
3. WHEN el usuario selecciona una pestaña, THE `DashboardTabs` SHALL mostrar el contenido de esa pestaña sin realizar una navegación de página ni una petición al servidor.
4. THE `DashboardTabs` SHALL recibir todos los datos necesarios para las tres pestañas como props serializables desde el `InstructorDashboard`.
5. THE `DashboardTabs` SHALL aplicar estilos de pestaña activa con acento `primary-*` y pestañas inactivas con `text-neutral-400`.

### Requirement 3: Pestaña Academias

**User Story:** Como instructor, quiero ver y gestionar mis academias dentro de la pestaña correspondiente, para mantener la funcionalidad existente en el nuevo layout.

#### Acceptance Criteria

1. THE `AcademyTab` SHALL renderizar la lista de academias del instructor con el mismo contenido visual que el `AcademySection` actual.
2. THE `AcademyTab` SHALL incluir el botón "Crear academia" que abre el `CreateAcademyModal` existente.
3. IF el instructor no tiene academias asignadas, THEN THE `AcademyTab` SHALL mostrar un mensaje de estado vacío.

### Requirement 4: Pestaña Alumnos

**User Story:** Como instructor, quiero ver y buscar mis alumnos dentro de la pestaña correspondiente, para mantener la funcionalidad existente en el nuevo layout.

#### Acceptance Criteria

1. THE `StudentTab` SHALL renderizar la tabla de alumnos con búsqueda y paginación con el mismo comportamiento que el `StudentSection` actual.
2. THE `StudentTab` SHALL mantener la búsqueda por nombre mediante el parámetro de URL `q` y la paginación mediante el parámetro `page`.
3. IF no se encuentran alumnos para la búsqueda activa, THEN THE `StudentTab` SHALL mostrar un mensaje indicando que no se encontraron resultados.

### Requirement 5: Pestaña Solicitudes

**User Story:** Como instructor, quiero ver el historial de mis solicitudes de certificación y crear nuevas solicitudes desde la misma pestaña, para gestionar todo el flujo de certificación en un solo lugar.

#### Acceptance Criteria

1. THE `SolicitudesTab` SHALL renderizar el historial de solicitudes de certificación en modo solo lectura, sin formulario inline.
2. THE `SolicitudesTab` SHALL incluir un botón "Nueva solicitud" visible en la cabecera de la pestaña.
3. WHEN el usuario hace clic en el botón "Nueva solicitud", THE `SolicitudesTab` SHALL abrir el `CertificationRequestModal`.
4. THE `SolicitudesTab` SHALL mantener la paginación del historial mediante el parámetro de URL `reqPage`.
5. IF el instructor no tiene solicitudes enviadas, THEN THE `SolicitudesTab` SHALL mostrar un mensaje de estado vacío.

### Requirement 6: Modal de Nueva Solicitud de Certificación

**User Story:** Como instructor, quiero crear una nueva solicitud de certificación desde un modal, para no perder el contexto del historial mientras completo el formulario.

#### Acceptance Criteria

1. THE `CertificationRequestModal` SHALL implementarse usando `@radix-ui/react-dialog` con overlay y animaciones de entrada/salida.
2. THE `CertificationRequestModal` SHALL contener el `RequestCertificationForm` existente con la lista de alumnos activos como prop.
3. WHEN el formulario dentro del `CertificationRequestModal` se envía exitosamente, THE `CertificationRequestModal` SHALL cerrarse automáticamente.
4. WHEN el usuario hace clic fuera del modal o en el botón de cierre, THE `CertificationRequestModal` SHALL cerrarse sin enviar el formulario.
5. THE `CertificationRequestModal` SHALL aplicar el dark theme con fondo `bg-neutral-900`, borde `border-neutral-700` y overlay `bg-black/70 backdrop-blur-sm`.

### Requirement 7: Data Fetching en Server Component

**User Story:** Como desarrollador, quiero que todo el data fetching permanezca en el Server Component `page.tsx`, para mantener la arquitectura limpia y el rendimiento de renderizado en servidor.

#### Acceptance Criteria

1. THE `InstructorDashboard` SHALL ejecutar todas las consultas a Supabase necesarias para las tres pestañas y los KPIs en el Server Component `page.tsx`, usando `Promise.all` para consultas independientes.
2. THE `InstructorDashboard` SHALL pasar únicamente datos serializables (sin instancias de clase, `Date` objects, o funciones) como props a los Client Components.
3. THE `DashboardTabs` SHALL ser un Client Component marcado con `"use client"` que recibe todos los datos como props y no realiza fetch propio.
4. IF un Client Component necesita ejecutar una mutación, THEN THE Client Component SHALL llamar a un Server Action existente, no a una API route directamente.

### Requirement 8: Diseño Visual Dark Theme

**User Story:** Como instructor, quiero que el dashboard tenga un aspecto visual atractivo y consistente con el dark theme del sistema, para una experiencia de uso profesional.

#### Acceptance Criteria

1. THE `InstructorDashboard` SHALL usar `bg-neutral-950` como fondo de página y `bg-neutral-900` como fondo de tarjetas y contenedores.
2. THE `KPIRow` SHALL usar bordes `border-neutral-700/800`, texto secundario `text-neutral-400` y valores destacados con `text-primary-400` o `text-neutral-50`.
3. THE `DashboardTabs` SHALL usar la lista de pestañas con fondo `bg-neutral-900 border-b border-neutral-800` y la pestaña activa con indicador de color `primary-*`.
4. WHILE un tab trigger está en estado hover, THE `DashboardTabs` SHALL aplicar `text-neutral-200` como color de texto.

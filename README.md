# Kombat Taekwondo — Sistema de Gestión

Plataforma web para la gestión integral de practicantes, academias, eventos y certificaciones de la organización Kombat Taekwondo en Chile.

---

## Stack tecnológico

- **Next.js 15** (App Router) — framework principal
- **Supabase** — autenticación y base de datos PostgreSQL
- **Drizzle ORM** — acceso a datos
- **Tailwind CSS v4 + Radix UI** — interfaz dark-first
- **TypeScript** — tipado estricto en todo el proyecto

---

## Perfiles de usuario

El sistema tiene cuatro perfiles con acceso diferenciado:

| Perfil                              | Acceso                                                               |
| ----------------------------------- | -------------------------------------------------------------------- |
| **Público**                         | Páginas de academias y eventos sin autenticación                     |
| **Practicante**                     | Dashboard personal, historial, ranking y certificaciones             |
| **Instructor / Profesor / Maestro** | Todo lo anterior + gestión de alumnos y solicitudes de certificación |
| **Administrador**                   | Acceso completo al panel de administración                           |

---

## Acceso público

Disponible sin iniciar sesión:

- `/academies` — Directorio de academias activas
- `/events` — Calendario de eventos marciales
- `/login`, `/register`, `/reset-password` — Flujos de autenticación

---

## Perfil: Practicante

Todo practicante autenticado tiene acceso a las siguientes secciones:

### Dashboard (`/dashboard`)

Vista general personal con:

- Tarjeta de identidad: nombre, grado, estado y fecha de inicio
- KPIs: eventos participados, certificaciones activas, posición en ranking y puntos
- Últimas 3 entradas del historial marcial
- Próximos 3 eventos
- Certificaciones activas recientes

### Mi Perfil (`/profile`)

- Datos personales: nombre, RUT, fecha de nacimiento, género, grado, peso
- Información de contacto
- Código QR de verificación de identidad
- Estado de actividad (activo / inactivo)

### Historial Marcial (`/martial-history`)

Tabla completa de participaciones en eventos:

- Tipo de evento (competencia, seminario, examen)
- Fecha, resultado y notas
- Estado de corrección del registro

### Ranking (`/ranking`)

- Posición actual y percentil dentro de su categoría
- Puntos totales acumulados
- Categoría por grado, edad y peso
- Historial mensual de posiciones (snapshots)

### Certificaciones (`/certifications`)

- Certificaciones activas: grado técnico, instructor, árbitro, entrenador, participación en evento
- Certificaciones revocadas con motivo
- Enlace de verificación pública por certificado

---

## Perfil: Instructor / Profesor / Maestro

Accede a todo lo del practicante más el panel de instructor.

### Panel Instructor (`/instructor`)

**Mis Alumnos**

- Tabla paginada (25 por página) de todos los alumnos asignados
- Columnas: nombre, RUT, grado, Dan, estado, fecha de inicio
- Enlace al perfil de cada alumno

**Mis Academias**

- Grilla de academias donde el instructor es responsable
- Nombre, ubicación y estado de cada academia

**Solicitar Certificación**

- Formulario para solicitar certificaciones para alumnos activos
- Tipos disponibles: grado técnico, instructor, árbitro, entrenador, participación en evento
- Campo de notas opcional
- Las solicitudes quedan pendientes de aprobación por el administrador

### Registro de Alumnos (`/instructor/register`)

Formulario completo para registrar nuevos practicantes:

- Datos personales: nombre completo, RUT, fecha de nacimiento, género, peso
- Datos marciales: grado, nivel Dan, fecha de inicio
- Contacto: email, teléfono
- Dirección: calle, ciudad, región
- El instructor queda asignado automáticamente como instructor del alumno

---

## Perfil: Administrador

Accede a todo lo anterior más el panel de administración completo.

### Dashboard Admin (`/admin/dashboard`)

- KPIs del sistema: total de practicantes, practicantes activos, academias activas, próximos eventos
- Gráfico de distribución de grados (barras por color de cinturón)
- Lista de próximos 5 eventos con días restantes
- Tabla de academias activas con conteo de alumnos

### Gestión de Practicantes (`/admin/practitioners`)

- Listado completo con filtros: nombre, RUT, grado, academia, estado
- Columnas ordenables: nombre, grado, fecha de inicio, fecha de registro
- Paginación (25 por página)
- Datos enriquecidos: nombre de academia, instructor, ciudad, región
- Acceso al detalle individual de cada practicante
- Botón para registrar nuevo practicante manualmente

### Gestión de Academias (`/admin/academies`)

- Listado con filtros: nombre, ciudad, región, estado (activa/inactiva)
- Columnas ordenables: nombre, región, ciudad, fecha de creación
- Paginación (25 por página)
- Conteo de miembros activos por academia
- Vista de detalle por academia: información completa, lista de miembros, instructores responsables
- Registro de nuevas academias

### Gestión de Eventos (`/admin/events`)

- Listado con filtros: tipo (competencia, seminario, examen), búsqueda por nombre
- Columnas: nombre, tipo, fecha, ubicación, estado (pasado/próximo)
- Crear, editar y eliminar eventos
- Vista de detalle: información del evento, lista de participantes, gestión de resultados

### Solicitudes de Certificación (`/admin/certification-requests`)

- Cola de solicitudes pendientes enviadas por instructores
- Columnas: instructor solicitante, alumno, tipo de certificación, notas, fecha
- Acciones: aprobar o rechazar cada solicitud
- Paginación (25 por página)

### Gestión de Cobros (`/admin/charges`)

- Resumen financiero: total de cobros pendientes, vencidos y practicantes con deuda
- Tabla de practicantes con conteo de cobros pendientes y vencidos
- Vista individual por practicante: todos sus cobros con estado (pendiente, pagado, vencido)
- Registro y gestión de pagos

---

## Dominio de negocio

### Grados (cinturones)

`Blanco → Amarillo → Verde → Azul → Rojo → Negro`

Los cinturones negros tienen niveles Dan (1° a n°).

### Tipos de evento

- **Competencia** — torneos y campeonatos
- **Seminario** — capacitaciones y clínicas
- **Examen** — evaluaciones de grado

### Tipos de certificación

- Grado técnico
- Instructor
- Árbitro
- Entrenador
- Participación en evento

### Categorías de ranking

- **Por edad**: Sub-12, 12-17, 18-30, 30+
- **Por peso**: Fin, Fly, Bantam, Pluma, Ligero, Welter, Medio, Pesado

### Regiones

Cobertura completa de las 16 regiones de Chile.

---

## Configuración inicial

### Variables de entorno

Copiar `.env.local.example` a `.env.local` y completar:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Seed de datos

```bash
# Crear usuarios de autenticación en Supabase
pnpm seed:users

# Poblar academias
pnpm seed:academies

# Poblar practicantes
pnpm seed:practitioners
```

Credenciales de prueba (contraseña: `Kombat2025!`):

- `admin@kombat.cl` — Administrador
- `maestro@kombat.cl` — Instructor

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (dashboard)/        # Rutas autenticadas
│   │   ├── admin/          # Panel de administración
│   │   ├── instructor/     # Panel de instructor
│   │   ├── dashboard/      # Dashboard del practicante
│   │   ├── profile/        # Perfil personal
│   │   ├── martial-history/
│   │   ├── ranking/
│   │   └── certifications/
│   ├── (marketing)/        # Páginas públicas
│   └── auth/               # Flujos de autenticación
├── modules/
│   └── practitioner-identity/  # Dominio principal
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── presentation/
├── shared/
└── lib/
    ├── db/                 # Drizzle client + schema + migraciones
    ├── supabase/           # Clientes Supabase (server/client/admin)
    └── auth.ts
```

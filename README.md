# Kombat ID — Plataforma de Identidad Digital Kombat Taekwondo Chile

Sistema de gestión de identidad oficial para practicantes de Kombat Taekwondo en Chile. Centraliza el perfil único de cada atleta, su historial marcial, ranking competitivo, certificaciones digitales y verificación presencial por código QR.

---

## Características principales

- **Identidad única por practicante** — perfil con RUT, grado, historial y estado activo/inactivo
- **Historial marcial inmutable** — registro cronológico de competencias, seminarios y exámenes
- **Ranking por categoría** — calculado por grado, rango de edad y categoría de peso, con soporte nacional e internacional
- **Certificaciones digitales** — emitidas por administradores con snapshot inmutable del perfil al momento de emisión
- **Verificación por QR** — escaneo público sin autenticación para validación presencial
- **Red de academias** — gestión de la red nacional de academias con membresías de practicantes
- **Sistema jerárquico de roles** — Alumno, Instructor, Profesor, Maestro con línea de maestros certificadores
- **Perfil marcial extendido** — grados en múltiples disciplinas (Kombat Taekwondo, WTF, Hapkido, Kick Boxing, Defensa Personal)
- **Panel de administración** — gestión completa del ciclo de vida de practicantes, eventos y certificaciones

---

## Stack tecnológico

| Capa          | Tecnología                                 |
| ------------- | ------------------------------------------ |
| Framework     | Next.js 15 (App Router)                    |
| Lenguaje      | TypeScript 5                               |
| Base de datos | Supabase (PostgreSQL) + Row Level Security |
| Auth          | Supabase Auth                              |
| Storage       | Supabase Storage (fotos de perfil)         |
| ORM           | Drizzle ORM                                |
| UI            | Radix UI + Tailwind CSS v4                 |
| Validación    | Zod                                        |
| QR            | qrcode (generación server-side)            |

---

## Arquitectura

El proyecto sigue **Clean Architecture + Screaming Architecture** sobre Next.js App Router:

```
src/
├── app/                        # Rutas Next.js (framework layer)
│   ├── (dashboard)/            # Área autenticada
│   │   ├── profile/            # Perfil del practicante
│   │   ├── martial-history/    # Historial marcial
│   │   ├── ranking/            # Ranking por categoría
│   │   ├── certifications/     # Certificaciones
│   │   └── admin/              # Panel de administración
│   ├── verify/                 # Rutas públicas de verificación (sin auth)
│   │   ├── qr/[token]/         # Verificación por QR
│   │   └── cert/[certId]/      # Verificación de certificación
│   └── api/qr/[token]/         # Endpoint JSON para apps de escaneo
└── modules/
    └── practitioner-identity/
        ├── domain/             # Entidades, interfaces, errores (sin dependencias)
        ├── application/        # Casos de uso
        ├── infrastructure/     # Repositorios Drizzle/Supabase
        └── presentation/       # Server Actions y componentes
```

---

## Requisitos previos

- Node.js 20+
- pnpm
- Cuenta en [Supabase](https://supabase.com)

---

## Instalación

```bash
# Instalar dependencias
pnpm install

# Copiar variables de entorno
cp .env.local.example .env.local
# Completar con tus credenciales de Supabase
```

### Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_your_key_here
SUPABASE_SERVICE_ROLE_KEY=sb_secret_your_service_role_key_here
```

> Las claves se encuentran en **Supabase Dashboard → Project Settings → API**. Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` al cliente.

---

## Desarrollo

```bash
pnpm dev        # Servidor de desarrollo en http://localhost:3000
pnpm build      # Build de producción
pnpm type-check # Verificación de tipos TypeScript
pnpm lint       # ESLint
```

### Seed de datos

```bash
pnpm seed          # Datos de ejemplo
pnpm seed:users    # Usuarios de autenticación de prueba
```

---

## Roles de usuario

| Rol          | Descripción                                |
| ------------ | ------------------------------------------ |
| `alumno`     | Practicante estándar                       |
| `instructor` | Requiere grado mínimo cinturón rojo        |
| `profesor`   | Requiere grado mínimo 1er dan negro        |
| `maestro`    | Requiere grado mínimo 3er dan negro        |
| `admin`      | Acceso completo al panel de administración |

---

## Verificación pública

Las rutas `/verify/*` son accesibles sin autenticación:

- `https://tu-dominio.com/verify/qr/{token}` — muestra nombre, grado y estado del practicante
- `https://tu-dominio.com/verify/cert/{certId}` — muestra estado de una certificación (vigente/revocada)
- `GET /api/qr/{token}` — respuesta JSON para apps de escaneo

---

## Licencia

Privado — Kombat Taekwondo Chile

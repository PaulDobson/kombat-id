# Kombat Taekwondo — Workspace Guidelines

Sistema de gestión para practicantes, academias, eventos y certificaciones en Chile. Next.js 15 + Supabase + Drizzle ORM.

Ver [README.md](../README.md) para descripción completa del sistema y perfiles de usuario.

---

## Idioma del Proyecto

**Todo el contenido en español**: UI, mensajes de error, validaciones, comentarios de código, documentación y commits. Este es un requisito del cliente y del proyecto.

---

## Arquitectura

### Patrón Domain-Driven Design (DDD)

Módulos siguen estructura estricta (ver `src/modules/practitioner-identity/` como referencia):

```
domain/          # Entidades, value objects, interfaces (agnóstico de framework)
infrastructure/  # Repositorios con Supabase/Drizzle
application/     # Casos de uso (orquestación de lógica de negocio)
presentation/    # Componentes React, hooks, Server Actions
```

**Regla clave**: Domain no debe importar de infrastructure ni presentation.

### Acceso a Datos

- **Repositorios usan `adminSupabase` directamente**, no queries tradicionales de Drizzle
- Instanciar repositorios por request (no singletons) para mantener contexto de auth
- Validación con Zod en capa de repositorio (`*Schema.parse()`)
- Snake_case en DB → camelCase en entidades de dominio
- Tipos generados: `src/types/database.types.ts` (auto-generado desde Supabase)

### Clientes Supabase

```typescript
// Cliente browser (componentes client)
import { createClient } from "@/lib/supabase/client";

// Cliente server (Server Components, Server Actions)
import { createClient, requireUser } from "@/lib/supabase/server";

// Cliente admin (operaciones privilegiadas)
import { adminSupabase } from "@/lib/supabase/admin";
```

**Proteger rutas**: Usa `requireUser()` en Server Components para obtener usuario autenticado.

### Autenticación y Autorización

- Middleware protege todas las rutas excepto lista explícita en `src/middleware.ts`
- **Roles**: alumno, instructor, profesor, maestro (campo `role` en `practitioner`)
- **Admin**: tabla separada `admin_users` para acceso administrativo
- Redirecciones automáticas de páginas auth si ya hay sesión activa

---

## Convenciones de Código

### Organización de Componentes

- **File-colocation**: Formularios viven con sus páginas (`/login/LoginForm.tsx`)
- **Nomenclatura**:
  - Server Components: `async function Page()` como export default
  - Client Components: `"use client"` + named exports
  - Formularios: sufijo `*Form.tsx`
  - Componentes compartidos: `app/_components/` o `presentation/components/`

### TypeScript

- Configuración estricta activada (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)
- Nunca usar `any` — preferir `unknown` y type guards
- Errores de dominio: extender `DomainError` (ver `domain/errors/`)

### Estilos

- **Tailwind CSS v4** + Radix UI
- **Dark-first**: diseño optimizado para tema oscuro
- Utility `cn()` para merge de clases (`lib/cn.ts`)

---

## Build y Desarrollo

```bash
pnpm dev           # Servidor desarrollo (puerto 3000)
pnpm build         # Build producción
pnpm type-check    # Verificar tipos sin build
pnpm lint          # ESLint

# Seeds (requiere Supabase configurado)
pnpm seed:users         # Crear usuarios auth
pnpm seed:practitioners # Poblar datos de practicantes
pnpm seed               # Seed completo
```

**Antes de commit**: Ejecutar `pnpm type-check` para validar tipos.

---

## Patrones Específicos del Proyecto

### Tokens QR

- Campo `qr_token` (UUID) en tabla `practitioner` para verificación de identidad
- Ruta pública: `/verify/qr/[token]` — muestra perfil verificado sin auth
- Generado automáticamente en seed scripts

### Sistema de Certificaciones

- Tipos: grado técnico, instructor, árbitro, entrenador, participación en evento
- Estados: activa, revocada
- Snapshots JSON de datos del practicante en momento de emisión
- Verificación pública por `cert_id`

### Ranking y Categorías

- Snapshots mensuales de posición (`ranking_positions`)
- Categorización automática por edad, peso y grado
- Sistema de puntos acumulativos por participación en eventos

### Rutas Agrupadas

```
(dashboard)/       # Requiere auth, layout compartido con nav
├── admin/         # Solo admin_users
├── instructor/    # Solo instructor/profesor/maestro
└── [otras]/       # Todos los practicantes autenticados
```

---

## Errores Comunes a Evitar

1. **No usar cliente admin en componentes client** — solo en server-side
2. **No hardcodear rutas públicas** — actualizar array en `middleware.ts`
3. **No mezclar snake_case/camelCase** — respetar convención por capa
4. **No hacer repositorios singleton** — instanciar por request
5. **No consultar mismo dato múltiples veces** — usar datos de `requireUser()` cuando sea posible

---

## Documentación Adicional

- Migraciones: `lib/db/migrations/*.sql` (numeradas 001-027)
- Temas de color: `DARK_THEME_COLORS.md`, `LIGHT_THEME_UPDATE.md`
- Manual de usuario: `MANUAL_USUARIO.md`

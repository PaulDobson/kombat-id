# Design Document — Kombat Taekwondo Identity

## Overview

Kombat Taekwondo Identity es un módulo de dominio que se integra sobre la infraestructura existente (Supabase Auth, Next.js App Router, Clean + Screaming Architecture). Gestiona la identidad digital de cada practicante: perfil único, historial marcial inmutable, ranking por categoría, certificaciones digitales verificables y verificación presencial por QR.

El módulo vive en `src/modules/practitioner-identity/` y expone sus capacidades a través de Server Actions y Server Components. Las rutas públicas de verificación (QR y certificaciones) son accesibles sin autenticación. Todas las mutaciones administrativas requieren rol `admin` verificado server-side.

### Decisiones de diseño clave

- **RUT como clave de unicidad de negocio**, pero el identificador público expuesto en URLs es un UUID v4 (`public_id`) para no exponer datos sensibles.
- **Historial marcial inmutable**: las entradas nunca se eliminan; se marcan como `corrected` con justificación y se crea una entrada de corrección.
- **Snapshot de certificación**: al emitir una certificación se guarda un JSON snapshot del perfil en ese momento, garantizando inmutabilidad de los datos certificados.
- **QR como token opaco**: el QR contiene una URL con un token UUID regenerable, no el `public_id` directamente, para permitir invalidación sin cambiar la identidad pública.
- **Ranking calculado on-demand + cache**: el ranking se recalcula al registrar resultados de competencia y se persiste en tabla `ranking_snapshots` para consulta eficiente.
- **Supabase Storage** para fotos de perfil con bucket privado y URLs firmadas de corta duración para visualización autenticada.

---

## Architecture

El módulo sigue la estructura de capas de Clean Architecture dentro de Screaming Architecture:

```
src/modules/practitioner-identity/
├── domain/
│   ├── entities/           # Tipos puros: Practitioner, MartialEvent, Ranking, Certification
│   ├── interfaces/         # Contratos de repositorios
│   ├── value-objects/      # RUT, Grade, WeightCategory, AgeRange
│   └── errors/             # PractitionerNotFoundError, DuplicateRutError, etc.
├── application/
│   └── use-cases/          # Un archivo por caso de uso
├── infrastructure/
│   └── repositories/       # Implementaciones Supabase/Drizzle
└── presentation/
    ├── actions/             # Server Actions ("use server")
    ├── components/          # Server y Client Components
    └── hooks/               # Client hooks
```

### Rutas Next.js

```
src/app/
├── (dashboard)/
│   ├── dashboard/
│   │   └── page.tsx                          # Resumen del practicante autenticado
│   ├── profile/
│   │   ├── page.tsx                          # Ver/editar perfil propio
│   │   └── [publicId]/
│   │       └── page.tsx                      # Ver perfil de otro practicante (autenticado)
│   ├── martial-history/
│   │   └── page.tsx                          # Historial marcial propio
│   ├── ranking/
│   │   └── page.tsx                          # Ranking por categoría
│   ├── certifications/
│   │   └── page.tsx                          # Lista de certificaciones propias
│   └── admin/
│       ├── practitioners/
│       │   ├── page.tsx                      # Búsqueda y listado
│       │   ├── new/page.tsx                  # Registrar practicante
│       │   └── [publicId]/
│       │       ├── page.tsx                  # Detalle admin
│       │       ├── grade/page.tsx            # Actualizar grado
│       │       └── certifications/new/page.tsx
│       └── events/
│           ├── page.tsx                      # Gestión de eventos marciales
│           └── new/page.tsx
├── verify/
│   ├── qr/[token]/
│   │   └── page.tsx                          # Verificación pública por QR (sin auth)
│   └── cert/[certId]/
│       └── page.tsx                          # Verificación pública de certificación (sin auth)
└── api/
    └── qr/[token]/
        └── route.ts                          # Endpoint JSON para apps de escaneo QR
```

### Flujo de dependencias

```
Domain ← Application ← Infrastructure
                     ← Presentation (actions como composition root)
app/ ← Presentation
verify/ ← Presentation (rutas públicas, sin auth)
```

---

## Components and Interfaces

### Repositorios (contratos de dominio)

```typescript
// domain/interfaces/practitionerRepository.ts
interface PractitionerRepository {
  findById(publicId: string): Promise<Practitioner | null>;
  findByRut(rut: string): Promise<Practitioner | null>;
  findByAuthUserId(authUserId: string): Promise<Practitioner | null>;
  findByQrToken(token: string): Promise<Practitioner | null>;
  search(query: PractitionerSearchQuery): Promise<Practitioner[]>;
  save(practitioner: Practitioner): Promise<void>;
  updateGrade(publicId: string, grade: Grade, adminId: string): Promise<void>;
  setActiveStatus(
    publicId: string,
    active: boolean,
    reason: string,
    adminId: string,
  ): Promise<void>;
  regenerateQrToken(publicId: string, adminId: string): Promise<string>;
}

// domain/interfaces/martialHistoryRepository.ts
interface MartialHistoryRepository {
  findByPractitionerId(publicId: string): Promise<MartialHistoryEntry[]>;
  addEntry(entry: NewMartialHistoryEntry): Promise<MartialHistoryEntry>;
  markCorrected(
    entryId: string,
    justification: string,
    adminId: string,
  ): Promise<void>;
  existsForEvent(practitionerId: string, eventId: string): Promise<boolean>;
}

// domain/interfaces/rankingRepository.ts
interface RankingRepository {
  findByPractitioner(publicId: string): Promise<RankingPosition | null>;
  findByCategory(category: RankingCategory): Promise<RankingPosition[]>;
  recalculateCategory(category: RankingCategory): Promise<void>;
  saveSnapshot(snapshot: RankingSnapshot): Promise<void>;
  findSnapshots(
    publicId: string,
    period: "monthly" | "annual",
  ): Promise<RankingSnapshot[]>;
}

// domain/interfaces/certificationRepository.ts
interface CertificationRepository {
  findById(certId: string): Promise<Certification | null>;
  findByPractitioner(publicId: string): Promise<Certification[]>;
  save(cert: Certification): Promise<void>;
  revoke(certId: string, reason: string, adminId: string): Promise<void>;
}

// domain/interfaces/auditLogRepository.ts
interface AuditLogRepository {
  log(entry: AuditLogEntry): Promise<void>;
  findByAdmin(adminId: string, limit?: number): Promise<AuditLogEntry[]>;
}

// domain/interfaces/qrScanRepository.ts
interface QrScanRepository {
  recordScan(token: string, timestamp: Date): Promise<void>;
}
```

### Casos de uso principales

```typescript
// application/use-cases/
registerPractitioner.ts; // Crea perfil + QR token
updateProfilePhoto.ts; // Sube foto a Storage, actualiza URL
updateContactInfo.ts; // Actualiza teléfono/email de contacto
addMartialHistoryEntry.ts; // Admin: agrega entrada al historial
updatePractitionerGrade.ts; // Admin: actualiza grado + agrega entrada historial
issueCertification.ts; // Admin: emite certificación con snapshot
revokeCertification.ts; // Admin: revoca certificación
verifyByQrToken.ts; // Público: retorna datos de verificación
verifyCertification.ts; // Público: retorna estado de certificación
searchPractitioners.ts; // Admin: búsqueda por nombre/RUT/grado
deactivatePractitioner.ts; // Admin: desactiva practicante
recalculateRanking.ts; // Interno: recalcula ranking de categoría
```

### Server Actions

```typescript
// presentation/actions/practitionerActions.ts  ("use server")
registerPractitionerAction(input: unknown): Promise<ActionResult<{ publicId: string }>>
updateProfilePhotoAction(input: unknown): Promise<ActionResult>
updateContactInfoAction(input: unknown): Promise<ActionResult>

// presentation/actions/adminActions.ts  ("use server")
addMartialHistoryEntryAction(input: unknown): Promise<ActionResult<MartialHistoryEntry>>
updatePractitionerGradeAction(input: unknown): Promise<ActionResult>
issueCertificationAction(input: unknown): Promise<ActionResult<{ certId: string }>>
revokeCertificationAction(input: unknown): Promise<ActionResult>
deactivatePractitionerAction(input: unknown): Promise<ActionResult>
regenerateQrTokenAction(input: unknown): Promise<ActionResult<{ token: string }>>
searchPractitionersAction(input: unknown): Promise<ActionResult<Practitioner[]>>
```

---

## Data Models

### Schema de base de datos (Supabase / PostgreSQL)

#### Tabla: `practitioners`

```sql
CREATE TABLE practitioners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),   -- public_id expuesto en URLs
  auth_user_id  UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  rut           TEXT UNIQUE NOT NULL,                          -- formato: 12345678-9
  full_name     TEXT NOT NULL,
  birth_date    DATE NOT NULL,
  gender        TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  grade         TEXT NOT NULL DEFAULT 'white',                 -- white|yellow|green|blue|red|black
  dan           SMALLINT,                                      -- solo para cinturón negro (1-9)
  start_date    DATE NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  contact_phone TEXT,
  contact_email TEXT,
  photo_path    TEXT,                                          -- path en Supabase Storage
  qr_token      UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  weight_kg     NUMERIC(5,2),
  deactivated_at TIMESTAMPTZ,
  deactivation_reason TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;

-- Practicante puede leer su propio perfil
CREATE POLICY "practitioner_read_own" ON practitioners
  FOR SELECT USING (auth_user_id = auth.uid());

-- Admin puede leer todos
CREATE POLICY "admin_read_all" ON practitioners
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admin puede insertar/actualizar
CREATE POLICY "admin_write" ON practitioners
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

#### Tabla: `martial_history`

```sql
CREATE TABLE martial_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  event_id        UUID REFERENCES martial_events(id),
  event_type      TEXT NOT NULL CHECK (event_type IN ('competition', 'seminar', 'exam')),
  event_date      DATE NOT NULL,
  result          TEXT,                                        -- '1st', '2nd', '3rd', 'participant', 'passed', etc.
  notes           TEXT,
  is_corrected    BOOLEAN NOT NULL DEFAULT false,
  correction_note TEXT,
  corrected_at    TIMESTAMPTZ,
  corrected_by    UUID REFERENCES auth.users(id),
  recorded_by     UUID NOT NULL REFERENCES auth.users(id),    -- admin que registró
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (practitioner_id, event_id)                          -- evita duplicados por evento
);

ALTER TABLE martial_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practitioner_read_own_history" ON martial_history
  FOR SELECT USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "admin_all_history" ON martial_history
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

#### Tabla: `martial_events`

```sql
CREATE TABLE martial_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN ('competition', 'seminar', 'exam')),
  event_date  DATE NOT NULL,
  location    TEXT,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE martial_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_events" ON martial_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_write_events" ON martial_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

#### Tabla: `ranking_positions`

```sql
CREATE TABLE ranking_positions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  grade           TEXT NOT NULL,
  age_range       TEXT NOT NULL,                               -- 'under-12', '12-17', '18-30', '30+'
  weight_category TEXT NOT NULL,                               -- 'flyweight', 'lightweight', etc.
  total_points    INTEGER NOT NULL DEFAULT 0,
  position        INTEGER NOT NULL,
  category_count  INTEGER NOT NULL,                            -- total practicantes en categoría
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (practitioner_id, grade, age_range, weight_category)
);

ALTER TABLE ranking_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_ranking" ON ranking_positions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_write_ranking" ON ranking_positions
  FOR ALL USING (auth.role() = 'service_role');
```

#### Tabla: `ranking_snapshots`

```sql
CREATE TABLE ranking_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  period_type     TEXT NOT NULL CHECK (period_type IN ('monthly', 'annual')),
  period_label    TEXT NOT NULL,                               -- '2025-01', '2025'
  position        INTEGER NOT NULL,
  total_points    INTEGER NOT NULL,
  category_count  INTEGER NOT NULL,
  grade           TEXT NOT NULL,
  age_range       TEXT NOT NULL,
  weight_category TEXT NOT NULL,
  snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ranking_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practitioner_read_own_snapshots" ON ranking_snapshots
  FOR SELECT USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "admin_read_all_snapshots" ON ranking_snapshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

#### Tabla: `certifications`

```sql
CREATE TABLE certifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES practitioners(id),
  cert_type       TEXT NOT NULL CHECK (cert_type IN (
                    'technical_grade', 'instructor', 'referee', 'coach', 'event_participation'
                  )),
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by       UUID NOT NULL REFERENCES auth.users(id),
  is_revoked      BOOLEAN NOT NULL DEFAULT false,
  revoked_at      TIMESTAMPTZ,
  revocation_reason TEXT,
  revoked_by      UUID REFERENCES auth.users(id),
  -- Snapshot inmutable del perfil en el momento de emisión
  practitioner_snapshot JSONB NOT NULL,
  notes           TEXT
);

ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practitioner_read_own_certs" ON certifications
  FOR SELECT USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

-- Verificación pública: cualquiera puede leer (para URL pública de verificación)
CREATE POLICY "public_read_certs" ON certifications
  FOR SELECT USING (true);

CREATE POLICY "admin_write_certs" ON certifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

#### Tabla: `qr_scan_events`

```sql
CREATE TABLE qr_scan_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_token   UUID NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sin RLS restrictivo: escritura pública (sin auth) vía service_role en Server Action
-- Lectura solo para admins
ALTER TABLE qr_scan_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_scans" ON qr_scan_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

#### Tabla: `admin_users`

```sql
CREATE TABLE admin_users (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_admins" ON admin_users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

#### Tabla: `audit_log`

```sql
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,                                   -- 'practitioner', 'certification', etc.
  target_id   UUID,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_audit" ON audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "service_role_write_audit" ON audit_log
  FOR INSERT USING (auth.role() = 'service_role');
```

### Entidades de dominio (TypeScript)

```typescript
// domain/entities/practitioner.ts
export type Grade = "white" | "yellow" | "green" | "blue" | "red" | "black";
export type Gender = "male" | "female" | "other";

export interface Practitioner {
  id: string; // UUID público
  authUserId: string | null;
  rut: string; // formato: 12345678-9
  fullName: string;
  birthDate: string; // ISO date string (YYYY-MM-DD)
  gender: Gender;
  grade: Grade;
  dan: number | null;
  startDate: string;
  isActive: boolean;
  contactPhone: string | null;
  contactEmail: string | null;
  photoPath: string | null;
  qrToken: string;
  weightKg: number | null;
  deactivatedAt: string | null;
  deactivationReason: string | null;
  updatedAt: string;
  createdAt: string;
}

// domain/entities/martialHistoryEntry.ts
export type EventType = "competition" | "seminar" | "exam";

export interface MartialHistoryEntry {
  id: string;
  practitionerId: string;
  eventId: string | null;
  eventType: EventType;
  eventDate: string;
  result: string | null;
  notes: string | null;
  isCorrected: boolean;
  correctionNote: string | null;
  correctedAt: string | null;
  correctedBy: string | null;
  recordedBy: string;
  createdAt: string;
}

// domain/entities/ranking.ts
export type AgeRange = "under-12" | "12-17" | "18-30" | "30+";
export type WeightCategory =
  | "fin"
  | "fly"
  | "bantam"
  | "feather"
  | "light"
  | "welter"
  | "middle"
  | "heavy";

export interface RankingPosition {
  id: string;
  practitionerId: string;
  grade: Grade;
  ageRange: AgeRange;
  weightCategory: WeightCategory;
  totalPoints: number;
  position: number;
  categoryCount: number;
  calculatedAt: string;
}

export interface RankingSnapshot {
  id: string;
  practitionerId: string;
  periodType: "monthly" | "annual";
  periodLabel: string;
  position: number;
  totalPoints: number;
  categoryCount: number;
  grade: Grade;
  ageRange: AgeRange;
  weightCategory: WeightCategory;
  snapshotAt: string;
}

// domain/entities/certification.ts
export type CertType =
  | "technical_grade"
  | "instructor"
  | "referee"
  | "coach"
  | "event_participation";

export interface PractitionerSnapshot {
  id: string;
  fullName: string;
  rut: string;
  grade: Grade;
  dan: number | null;
  snapshotAt: string;
}

export interface Certification {
  id: string;
  practitionerId: string;
  certType: CertType;
  issuedAt: string;
  issuedBy: string;
  isRevoked: boolean;
  revokedAt: string | null;
  revocationReason: string | null;
  revokedBy: string | null;
  practitionerSnapshot: PractitionerSnapshot;
  notes: string | null;
}
```

### Supabase Storage — Fotos de perfil

- **Bucket**: `profile-photos` (privado, no público)
- **Path**: `{practitioner_public_id}/{timestamp}.{ext}`
- **Acceso**: URLs firmadas generadas server-side con expiración de 1 hora para visualización autenticada
- **Validación**: MIME type `image/jpeg` o `image/png`, tamaño máximo 5 MB, validado en Server Action antes de subir
- **Política de Storage RLS**: solo el propio practicante o un admin puede subir/leer su foto

```typescript
// Generación de URL firmada (en repositorio de infraestructura)
const { data } = await supabaseAdmin.storage
  .from("profile-photos")
  .createSignedUrl(photoPath, 3600); // 1 hora
```

### Generación de QR

- **Librería**: `qrcode` (npm) — genera QR como Data URL PNG en el servidor
- **Contenido del QR**: URL completa `https://{domain}/verify/qr/{qr_token}`
- **El token** es un UUID almacenado en `practitioners.qr_token`, regenerable por admin
- **Renderizado**: el QR se genera on-demand en el Server Component del perfil; no se persiste como imagen
- **Regeneración**: al regenerar, se actualiza `qr_token` en BD y se registra en `audit_log`

### URL pública de verificación de certificaciones

- **Formato**: `https://{domain}/verify/cert/{certification_id}`
- **Sin autenticación**: la ruta `/verify/*` está excluida del middleware de protección
- **Datos expuestos**: nombre del practicante (del snapshot), tipo de certificación, fecha de emisión, estado (vigente/revocada)
- **No se expone**: RUT, datos de contacto, `auth_user_id`

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Unicidad de identificadores de practicante

_Para todo_ conjunto de practicantes registrados en el sistema, no deben existir dos practicantes con el mismo `id` (UUID público), el mismo `rut`, el mismo `auth_user_id` (cuando no es null), ni el mismo `qr_token`.

**Validates: Requirements 1.1, 1.3, 1.5, 6.1**

### Property 2: Completitud de campos del perfil tras el registro

_Para todo_ input de registro válido, el perfil resultante debe contener valores no nulos para: `id`, `rut`, `fullName`, `birthDate`, `gender`, `grade`, `startDate`, `isActive`, `qrToken`, `createdAt`, `updatedAt`.

**Validates: Requirements 1.2**

### Property 3: El identificador público difiere del RUT

_Para todo_ practicante registrado, su `id` (UUID público) no debe ser igual a su `rut` ni contener el RUT como subcadena.

**Validates: Requirements 1.7**

### Property 4: Monotonicidad de `updated_at` en actualizaciones de perfil

_Para todo_ practicante y toda operación de actualización de perfil, el valor de `updated_at` posterior a la actualización debe ser mayor o igual al valor anterior.

**Validates: Requirements 1.6**

### Property 5: Campos protegidos no modificables por no-admin

_Para todo_ intento de actualización de perfil realizado por un usuario sin rol admin, los campos `rut`, `birthDate` y `grade` del perfil resultante deben ser idénticos a los valores previos a la operación.

**Validates: Requirements 2.3**

### Property 6: Validación de foto de perfil

_Para todo_ archivo enviado como foto de perfil, el sistema debe aceptarlo si y solo si su MIME type es `image/jpeg` o `image/png` Y su tamaño es menor o igual a 5 MB. Cualquier archivo que no cumpla ambas condiciones debe ser rechazado con un mensaje de error.

**Validates: Requirements 2.4, 2.5**

### Property 7: Perfil inactivo es de solo lectura

_Para todo_ practicante con `isActive = false`, cualquier intento de actualización de sus datos debe ser rechazado por el sistema.

**Validates: Requirements 2.6**

### Property 8: Completitud de campos en entradas del historial marcial

_Para toda_ entrada del historial marcial creada, los campos `id`, `practitionerId`, `eventType`, `eventDate`, `recordedBy` y `createdAt` deben estar presentes y no ser nulos.

**Validates: Requirements 3.1**

### Property 9: Round-trip de inserción e isolación de datos del historial

_Para todo_ practicante y toda entrada de historial marcial agregada a ese practicante, al consultar el historial del practicante la entrada debe estar presente; y al consultar el historial de cualquier otro practicante, la entrada no debe aparecer.

**Validates: Requirements 3.2, 3.4**

### Property 10: Historial marcial ordenado cronológicamente descendente

_Para todo_ practicante con dos o más entradas en su historial, la lista retornada por defecto debe estar ordenada de forma que `entries[i].eventDate >= entries[i+1].eventDate` para todo índice `i`.

**Validates: Requirements 3.3**

### Property 11: Restricción de tipo de evento marcial

_Para toda_ entrada del historial marcial, su campo `eventType` debe ser exactamente uno de: `'competition'`, `'seminar'`, `'exam'`.

**Validates: Requirements 3.5**

### Property 12: Rechazo de entradas duplicadas en historial

_Para todo_ par `(practitionerId, eventId)`, intentar registrar una segunda entrada con la misma combinación debe resultar en un error y dejar el historial sin cambios.

**Validates: Requirements 3.6**

### Property 13: Inmutabilidad del historial marcial

_Para toda_ entrada del historial marcial, después de aplicar una operación de corrección, la entrada original debe seguir existiendo en la base de datos con `isCorrected = true` y un `correctionNote` no vacío; el conteo total de entradas no debe disminuir.

**Validates: Requirements 3.7**

### Property 14: Correctitud de categoría en el ranking

_Para todo_ practicante con posición de ranking, su categoría `(grade, ageRange, weightCategory)` debe coincidir con los valores derivados de su perfil actual.

**Validates: Requirements 4.1**

### Property 15: Asignación correcta de puntos de ranking

_Para todo_ resultado de competencia, los puntos asignados deben ser exactamente: `1st → 100`, `2nd → 70`, `3rd → 50`, `participant → 10`. Cualquier otro resultado no debe asignar puntos de competencia.

**Validates: Requirements 4.3**

### Property 16: Completitud de campos en la respuesta de ranking

_Para todo_ practicante activo con datos de ranking, la respuesta debe contener `position`, `totalPoints` y `categoryCount` con valores numéricos no negativos.

**Validates: Requirements 4.4**

### Property 17: Practicantes inactivos excluidos del ranking

_Para todo_ resultado de ranking por categoría, ningún practicante con `isActive = false` debe aparecer en la lista retornada.

**Validates: Requirements 4.6**

### Property 18: Round-trip de snapshots de ranking

_Para todo_ snapshot de ranking guardado con `(practitionerId, periodType, periodLabel)`, debe ser recuperable con los mismos valores de `position`, `totalPoints` y `categoryCount`.

**Validates: Requirements 4.7**

### Property 19: Completitud de campos y tipos válidos en certificaciones

_Para toda_ certificación emitida, los campos `id`, `practitionerId`, `certType`, `issuedAt`, `issuedBy` y `practitionerSnapshot` deben estar presentes; y `certType` debe ser uno de: `'technical_grade'`, `'instructor'`, `'referee'`, `'coach'`, `'event_participation'`.

**Validates: Requirements 5.1, 5.3**

### Property 20: Certificaciones ordenadas por fecha de emisión descendente

_Para todo_ practicante con dos o más certificaciones, la lista retornada debe estar ordenada de forma que `certs[i].issuedAt >= certs[i+1].issuedAt` para todo índice `i`.

**Validates: Requirements 5.4**

### Property 21: Transición de estado de revocación e inmutabilidad

_Para toda_ certificación revocada, debe cumplirse: `isRevoked = true`, `revokedAt` no nulo, `revocationReason` no vacío; y la certificación debe seguir existiendo en el historial del practicante (no eliminada).

**Validates: Requirements 5.6, 5.7**

### Property 22: Inmutabilidad del snapshot de certificación

_Para toda_ certificación emitida, si el perfil del practicante es modificado después de la emisión, el campo `practitionerSnapshot` de la certificación debe permanecer igual al estado del perfil en el momento de la emisión.

**Validates: Requirements 5.8**

### Property 23: Completitud de la respuesta de verificación por QR

_Para todo_ token QR válido (activo o inactivo), la respuesta de verificación debe contener `fullName`, `grade`, `isActive` y `photoPath`; y si `isActive = false`, la respuesta debe indicar explícitamente el estado inactivo.

**Validates: Requirements 6.2, 6.4**

### Property 24: Registro de auditoría de escaneos QR

_Para todo_ escaneo de un QR token válido, debe crearse exactamente un registro en `qr_scan_events` con `qr_token` y `scanned_at` no nulos, y sin ningún campo que identifique al verificador.

**Validates: Requirements 6.5**

### Property 25: Operaciones admin rechazadas para no-admins

_Para toda_ llamada a una operación administrativa (registro de practicante, actualización de grado, emisión de certificación, gestión de eventos) realizada por un usuario sin rol admin, el sistema debe retornar un error de autorización sin ejecutar la operación.

**Validates: Requirements 7.1**

### Property 26: Actualización de grado crea entrada de historial tipo examen

_Para toda_ actualización de grado realizada por un admin, debe crearse una entrada en el historial marcial del practicante con `eventType = 'exam'`, `recordedBy` igual al ID del admin, y `eventDate` igual a la fecha de la operación.

**Validates: Requirements 7.2**

### Property 27: Transición de estado de desactivación

_Para toda_ operación de desactivación de un practicante, el practicante resultante debe tener `isActive = false`, `deactivatedAt` no nulo y `deactivationReason` no vacío.

**Validates: Requirements 7.3**

### Property 28: Búsqueda retorna practicantes que coinciden con el criterio

_Para toda_ búsqueda por nombre, RUT o grado, todos los practicantes retornados deben satisfacer el criterio de búsqueda; y ningún practicante que satisfaga el criterio debe estar ausente del resultado.

**Validates: Requirements 7.4**

### Property 29: Degradación de grado requiere justificación

_Para todo_ intento de asignar a un practicante un grado con menor rango que su grado actual, la operación debe ser rechazada si no se proporciona una justificación explícita no vacía.

**Validates: Requirements 7.5**

### Property 30: Acciones admin generan entradas en el log de auditoría

_Para toda_ acción administrativa ejecutada exitosamente, debe existir al menos una entrada en `audit_log` con `admin_id` igual al ID del administrador que ejecutó la acción, `action` no vacío y `created_at` no nulo.

**Validates: Requirements 7.6**

### Property 31: Round-trip de serialización del Perfil

_Para todo_ objeto `Practitioner` válido, aplicar la función de mapeo a fila de BD (`toRow`) y luego la función de mapeo a entidad (`fromRow`) debe producir un objeto equivalente al original en todos sus campos.

**Validates: Requirements 8.2**

### Property 32: Round-trip de serialización de Certificación

_Para todo_ objeto `Certification` válido (incluyendo su `practitionerSnapshot` JSONB), aplicar `toRow` seguido de `fromRow` debe producir un objeto equivalente al original, incluyendo la igualdad profunda del snapshot.

**Validates: Requirements 8.3**

### Property 33: Validación de schema en lectura de BD

_Para todo_ registro de BD que no cumpla el schema Zod esperado (campos faltantes, tipos incorrectos, valores fuera de enum), el repositorio debe lanzar un error de dominio descriptivo sin retornar datos parciales ni exponer detalles internos.

**Validates: Requirements 8.4, 8.5**

---

## Error Handling

### Jerarquía de errores de dominio

```typescript
// lib/errors.ts (base)
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// modules/practitioner-identity/domain/errors/
export class PractitionerNotFoundError extends DomainError {}
export class DuplicateRutError extends DomainError {}
export class InactivePractitionerError extends DomainError {}
export class UnauthorizedAdminError extends DomainError {}
export class DuplicateMartialHistoryEntryError extends DomainError {}
export class CertificationNotFoundError extends DomainError {}
export class CertificationAlreadyRevokedError extends DomainError {}
export class InvalidPhotoFileError extends DomainError {}
export class GradeDowngradeRequiresJustificationError extends DomainError {}
export class SchemaValidationError extends DomainError {}
export class QrTokenNotFoundError extends DomainError {}
```

### Mapeo de errores en Server Actions

Cada Server Action captura errores de dominio y los mapea a `ActionResult<T>` con `success: false` y un mensaje legible. Los errores inesperados se loguean server-side y se retorna un mensaje genérico al cliente.

```typescript
try {
  // ... use case
} catch (err) {
  if (err instanceof DuplicateRutError)
    return { success: false, error: "Ya existe un practicante con ese RUT." };
  if (err instanceof InactivePractitionerError)
    return { success: false, error: "El practicante está inactivo." };
  if (err instanceof UnauthorizedAdminError)
    return {
      success: false,
      error: "No tienes permisos para realizar esta acción.",
    };
  // ... otros errores de dominio
  console.error("[action] Unexpected error:", err);
  return {
    success: false,
    error: "Ocurrió un error inesperado. Intenta nuevamente.",
  };
}
```

### Seguridad y RLS

- **Todas las mutaciones** verifican sesión y rol admin server-side antes de ejecutar cualquier lógica.
- **RLS de Supabase** actúa como segunda línea de defensa: incluso si una Server Action falla en verificar el rol, la BD rechazará la operación.
- **Rutas públicas** (`/verify/qr/*`, `/verify/cert/*`) usan el cliente `supabaseAdmin` (service_role) solo para lectura de datos mínimos; nunca exponen RUT, `auth_user_id` ni datos de contacto.
- **Storage**: las fotos se sirven con URLs firmadas de corta duración (1h), nunca con URLs públicas permanentes.
- **QR token**: es un UUID opaco, no derivable del `public_id` ni del RUT.
- **Audit log**: se escribe con `service_role` para garantizar que no puede ser omitido por políticas RLS del usuario.

### Middleware — rutas públicas de verificación

```typescript
// src/middleware.ts — agregar rutas públicas
const PUBLIC_ROUTES = [...AUTH_ROUTES, "/auth/callback", "/verify"];
```

---

## Testing Strategy

### Enfoque dual: unit tests + property-based tests

Ambos tipos son complementarios y necesarios:

- **Unit tests**: ejemplos concretos, casos borde, condiciones de error, integración entre capas.
- **Property tests**: propiedades universales sobre rangos de inputs generados aleatoriamente.

### Librería de property-based testing

**`fast-check`** (TypeScript/JavaScript) — librería madura, bien mantenida, con soporte nativo para TypeScript.

```bash
pnpm add -D fast-check
```

Cada property test debe ejecutarse con mínimo **100 iteraciones** (configuración por defecto de fast-check es 100).

### Estructura de tests

```
src/modules/practitioner-identity/
├── domain/
│   └── __tests__/
│       ├── practitioner.test.ts          # Unit: value objects, validaciones
│       └── ranking.test.ts               # Unit: cálculo de puntos
├── application/
│   └── __tests__/
│       ├── registerPractitioner.test.ts
│       ├── issueCertification.test.ts
│       └── ...
└── infrastructure/
    └── __tests__/
        ├── practitionerRepository.pbt.ts  # Property tests: round-trip, schema
        └── certificationRepository.pbt.ts
```

### Configuración de property tests

Cada test de propiedad debe incluir un comentario de trazabilidad:

```typescript
// Feature: kombat-taekwondo-identity, Property 31: Round-trip de serialización del Perfil
it("practitioner round-trip serialization", () => {
  fc.assert(
    fc.property(arbitraryPractitioner(), (practitioner) => {
      const row = toRow(practitioner);
      const result = fromRow(row);
      expect(result).toEqual(practitioner);
    }),
    { numRuns: 100 },
  );
});
```

### Generadores (arbitraries) principales

```typescript
// Arbitrary para Practitioner válido
const arbitraryPractitioner = () =>
  fc.record({
    id: fc.uuid(),
    rut: fc.stringMatching(/^\d{7,8}-[\dkK]$/),
    fullName: fc.string({ minLength: 2, maxLength: 100 }),
    birthDate: fc
      .date({ min: new Date("1950-01-01"), max: new Date("2015-12-31") })
      .map((d) => d.toISOString().split("T")[0]),
    gender: fc.constantFrom("male", "female", "other"),
    grade: fc.constantFrom("white", "yellow", "green", "blue", "red", "black"),
    dan: fc.option(fc.integer({ min: 1, max: 9 })),
    isActive: fc.boolean(),
    // ... resto de campos
  });

// Arbitrary para Certification válida
const arbitraryCertification = () =>
  fc.record({
    id: fc.uuid(),
    certType: fc.constantFrom(
      "technical_grade",
      "instructor",
      "referee",
      "coach",
      "event_participation",
    ),
    isRevoked: fc.boolean(),
    practitionerSnapshot: arbitraryPractitionerSnapshot(),
    // ...
  });
```

### Cobertura por propiedad

| Propiedad                              | Tipo de test | Archivo                         |
| -------------------------------------- | ------------ | ------------------------------- |
| P1 Unicidad de IDs                     | property     | practitionerRepository.pbt.ts   |
| P2 Completitud de campos del perfil    | property     | registerPractitioner.test.ts    |
| P3 Public ID ≠ RUT                     | property     | practitioner.test.ts            |
| P4 Monotonicidad updated_at            | property     | updateContactInfo.test.ts       |
| P5 Campos protegidos no modificables   | property     | updateContactInfo.test.ts       |
| P6 Validación de foto                  | property     | updateProfilePhoto.test.ts      |
| P7 Perfil inactivo es read-only        | property     | updateContactInfo.test.ts       |
| P8 Completitud historial               | property     | addMartialHistory.test.ts       |
| P9 Round-trip inserción historial      | property     | martialHistoryRepository.pbt.ts |
| P10 Historial ordenado desc            | property     | martialHistoryRepository.pbt.ts |
| P11 Tipo de evento válido              | property     | addMartialHistory.test.ts       |
| P12 Duplicado historial rechazado      | property     | addMartialHistory.test.ts       |
| P13 Inmutabilidad historial            | property     | martialHistoryRepository.pbt.ts |
| P14 Categoría ranking correcta         | property     | ranking.test.ts                 |
| P15 Puntos de ranking                  | property     | ranking.test.ts                 |
| P16 Completitud ranking                | property     | rankingRepository.pbt.ts        |
| P17 Inactivos excluidos del ranking    | property     | rankingRepository.pbt.ts        |
| P18 Round-trip snapshot ranking        | property     | rankingRepository.pbt.ts        |
| P19 Completitud certificaciones        | property     | issueCertification.test.ts      |
| P20 Certificaciones ordenadas desc     | property     | certificationRepository.pbt.ts  |
| P21 Revocación e inmutabilidad         | property     | revokeCertification.test.ts     |
| P22 Snapshot inmutable                 | property     | issueCertification.test.ts      |
| P23 Respuesta QR completa              | property     | verifyByQrToken.test.ts         |
| P24 Auditoría de escaneos QR           | property     | verifyByQrToken.test.ts         |
| P25 Admin-only rechaza no-admins       | property     | adminActions.test.ts            |
| P26 Grado crea entrada historial       | property     | updatePractitionerGrade.test.ts |
| P27 Transición desactivación           | property     | deactivatePractitioner.test.ts  |
| P28 Búsqueda correcta                  | property     | searchPractitioners.test.ts     |
| P29 Degradación requiere justificación | property     | updatePractitionerGrade.test.ts |
| P30 Audit log en acciones admin        | property     | adminActions.test.ts            |
| P31 Round-trip Practitioner            | property     | practitionerRepository.pbt.ts   |
| P32 Round-trip Certification           | property     | certificationRepository.pbt.ts  |
| P33 Validación schema en lectura       | property     | practitionerRepository.pbt.ts   |

### Unit tests complementarios

- Ejemplo concreto de registro exitoso de practicante
- Ejemplo concreto de emisión y verificación de certificación
- Ejemplo concreto de escaneo QR de practicante activo e inactivo
- Casos borde: RUT con K mayúscula/minúscula, dan=null para no-negro, peso en límite de categoría
- Integración: Server Action → use case → repositorio mock

---

## Nuevos Módulos — Ecosistema Nacional de Kombat Taekwondo Chile

### Módulo 9: Sistema Jerárquico de Roles

#### Nuevos tipos de dominio

```typescript
// domain/entities/practitioner.ts — extensión
export type PractitionerRole = "alumno" | "instructor" | "profesor" | "maestro";
export type AgeCategory = "infantil" | "juvenil" | "adulto" | "senior";

// Reglas de negocio para roles (funciones puras en domain/)
// instructor: grade >= 'red'
// profesor:   grade === 'black' && dan >= 1
// maestro:    grade === 'black' && dan >= 3

// domain/entities/masterLineage.ts
export interface MasterLineageEntry {
  id: string;
  practitionerId: string; // practicante que recibió el grado
  certifyingMasterId: string; // Practicante con rol maestro/profesor que certificó
  grade: Grade;
  discipline: Discipline;
  certifiedAt: string; // ISO date string
  certificationId: string; // FK a certifications
}
```

#### Cambios en tabla `practitioners`

```sql
ALTER TABLE practitioners
  ADD COLUMN role          TEXT NOT NULL DEFAULT 'alumno'
                           CHECK (role IN ('alumno', 'instructor', 'profesor', 'maestro')),
  ADD COLUMN age_category  TEXT GENERATED ALWAYS AS (
    CASE
      WHEN EXTRACT(YEAR FROM AGE(birth_date)) < 12  THEN 'infantil'
      WHEN EXTRACT(YEAR FROM AGE(birth_date)) < 18  THEN 'juvenil'
      WHEN EXTRACT(YEAR FROM AGE(birth_date)) < 40  THEN 'adulto'
      ELSE 'senior'
    END
  ) STORED;
```

#### Nueva tabla: `master_lineage`

```sql
CREATE TABLE master_lineage (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id     UUID NOT NULL REFERENCES practitioners(id),
  certifying_master_id UUID NOT NULL REFERENCES practitioners(id),
  grade               TEXT NOT NULL,
  discipline          TEXT NOT NULL,
  certified_at        DATE NOT NULL,
  certification_id    UUID REFERENCES certifications(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE master_lineage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_lineage" ON master_lineage
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_write_lineage" ON master_lineage
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

#### Nuevos casos de uso

```typescript
// application/use-cases/
updatePractitionerRole.ts; // Admin: valida restricciones de grado antes de promover
getMasterLineage.ts; // Retorna cadena completa de maestros certificadores
```

#### Nuevas propiedades de correctitud (Roles)

**Property 34: Restricciones de rol por grado**
_Para todo_ practicante con rol `instructor`, su grado debe ser `red` o `black`. _Para todo_ practicante con rol `profesor`, su grado debe ser `black` con `dan >= 1`. _Para todo_ practicante con rol `maestro`, su grado debe ser `black` con `dan >= 3`.
**Validates: Requirements 9.8, 9.9, 9.10**

**Property 35: Categoría de edad derivada de fecha de nacimiento**
_Para todo_ practicante, su `ageCategory` debe ser exactamente la categoría correspondiente a su edad calculada a partir de `birthDate` según los rangos definidos en Requirement 9.2.
**Validates: Requirements 9.2, 9.3**

**Property 36: Maestro certificador válido en línea de maestros**
_Para toda_ entrada en `master_lineage`, el `certifyingMasterId` debe corresponder a un practicante existente con rol `maestro` o `profesor`.
**Validates: Requirements 9.4, 9.7**

---

### Módulo 10: Red Nacional de Academias

#### Nuevos tipos de dominio

```typescript
// domain/entities/academy.ts
export interface Academy {
  id: string;
  name: string;
  region: ChileanRegion;
  city: string;
  address: string;
  isActive: boolean;
  foundedAt: string; // ISO date string
  deactivatedAt: string | null;
  deactivationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ChileanRegion =
  | "arica-parinacota"
  | "tarapaca"
  | "antofagasta"
  | "atacama"
  | "coquimbo"
  | "valparaiso"
  | "metropolitana"
  | "ohiggins"
  | "maule"
  | "nuble"
  | "biobio"
  | "araucania"
  | "los-rios"
  | "los-lagos"
  | "aysen"
  | "magallanes";

// domain/entities/academyMembership.ts
export interface AcademyMembership {
  id: string;
  academyId: string;
  practitionerId: string;
  role: "student" | "instructor"; // rol del practicante en esta academia
  joinedAt: string;
  leftAt: string | null;
}
```

#### Nuevas tablas

```sql
CREATE TABLE academies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  region              TEXT NOT NULL,
  city                TEXT NOT NULL,
  address             TEXT NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  founded_at          DATE NOT NULL,
  deactivated_at      TIMESTAMPTZ,
  deactivation_reason TEXT,
  created_by          UUID NOT NULL REFERENCES auth.users(id),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE academies ENABLE ROW LEVEL SECURITY;

-- Lectura pública de academias activas (solo campos no sensibles)
CREATE POLICY "public_read_active_academies" ON academies
  FOR SELECT USING (is_active = true);

CREATE POLICY "admin_all_academies" ON academies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE TABLE academy_memberships (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id       UUID NOT NULL REFERENCES academies(id),
  practitioner_id  UUID NOT NULL REFERENCES practitioners(id),
  role             TEXT NOT NULL CHECK (role IN ('student', 'instructor')),
  joined_at        DATE NOT NULL DEFAULT CURRENT_DATE,
  left_at          DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Un practicante solo puede tener una membresía activa por academia
  UNIQUE NULLS NOT DISTINCT (practitioner_id, academy_id, left_at)
);

ALTER TABLE academy_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practitioner_read_own_memberships" ON academy_memberships
  FOR SELECT USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "admin_all_memberships" ON academy_memberships
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

#### Nuevos contratos de repositorio

```typescript
// domain/interfaces/academyRepository.ts
interface AcademyRepository {
  findById(id: string): Promise<Academy | null>;
  search(query: {
    name?: string;
    region?: ChileanRegion;
    city?: string;
  }): Promise<Academy[]>;
  findActive(): Promise<Academy[]>;
  save(academy: Academy): Promise<void>;
  deactivate(id: string, reason: string, adminId: string): Promise<void>;
  getActivePractitionerCount(academyId: string): Promise<number>;
}

// domain/interfaces/academyMembershipRepository.ts
interface AcademyMembershipRepository {
  findActiveByPractitioner(
    practitionerId: string,
  ): Promise<AcademyMembership | null>;
  findByAcademy(academyId: string): Promise<AcademyMembership[]>;
  addMember(
    membership: Omit<AcademyMembership, "id" | "createdAt">,
  ): Promise<AcademyMembership>;
  removeMember(
    practitionerId: string,
    academyId: string,
    leftAt: string,
  ): Promise<void>;
}
```

#### Nuevas Server Actions

```typescript
// presentation/actions/academyActions.ts  ("use server")
createAcademyAction(input: unknown): Promise<ActionResult<{ academyId: string }>>
deactivateAcademyAction(input: unknown): Promise<ActionResult>
assignPractitionerToAcademyAction(input: unknown): Promise<ActionResult>
removePractitionerFromAcademyAction(input: unknown): Promise<ActionResult>
searchAcademiesAction(input: unknown): Promise<ActionResult<Academy[]>>
```

#### Nuevas rutas Next.js

```
src/app/
├── (dashboard)/
│   └── admin/
│       └── academies/
│           ├── page.tsx              # Listado y búsqueda de academias
│           ├── new/page.tsx          # Registrar academia
│           └── [academyId]/
│               └── page.tsx          # Detalle y gestión de academia
└── academies/
    └── page.tsx                      # Vista pública de academias activas (sin auth)
```

#### Nuevas propiedades de correctitud (Academias)

**Property 37: Unicidad de membresía activa por practicante**
_Para todo_ practicante, no debe existir más de una membresía activa (sin `leftAt`) en el sistema simultáneamente.
**Validates: Requirements 10.5**

**Property 38: Rechazo de membresía en academia inactiva**
_Para todo_ intento de asociar un practicante a una academia con `isActive = false`, la operación debe ser rechazada con un error descriptivo.
**Validates: Requirements 10.7**

**Property 39: Conteo de practicantes activos en academia**
_Para toda_ academia activa, el conteo retornado por `getActivePractitionerCount` debe ser igual al número de membresías con `leftAt = null` y practicante con `isActive = true` asociadas a esa academia.
**Validates: Requirements 10.10**

---

### Módulo 11: Ranking Internacional

#### Cambios en entidades de dominio

```typescript
// domain/entities/martialHistoryEntry.ts — extensión
export type EventScope = "national" | "international";

// Extender MartialHistoryEntry con:
// eventScope: EventScope
// eventCountry: string | null   -- ISO 3166-1 alpha-2, solo para internacionales

// domain/entities/ranking.ts — extensión
export type RankingType = "national" | "international" | "combined";

export interface RankingPosition {
  // ... campos existentes ...
  rankingType: RankingType;
  internationalPosition: number | null; // null si no tiene resultados internacionales
  combinedPosition: number;
}
```

#### Cambios en tablas existentes

```sql
-- Extender martial_history
ALTER TABLE martial_history
  ADD COLUMN event_scope   TEXT NOT NULL DEFAULT 'national'
                           CHECK (event_scope IN ('national', 'international')),
  ADD COLUMN event_country TEXT;   -- ISO 3166-1 alpha-2, nullable

-- Extender ranking_positions
ALTER TABLE ranking_positions
  ADD COLUMN ranking_type          TEXT NOT NULL DEFAULT 'national'
                                   CHECK (ranking_type IN ('national', 'international', 'combined')),
  ADD COLUMN international_points  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN combined_points       INTEGER NOT NULL DEFAULT 0;
```

#### Lógica de puntos internacionales

```typescript
// domain/ — función pura
function calculateInternationalPoints(basePoints: number): number {
  return Math.round(basePoints * 1.5);
}

// Puntos combinados = puntos_nacionales + puntos_internacionales
// Ranking nacional: solo resultados con event_scope = 'national'
// Ranking internacional: solo resultados con event_scope = 'international'
// Ranking combinado: suma de ambos
```

#### Nuevas propiedades de correctitud (Ranking Internacional)

**Property 40: Multiplicador de puntos internacionales**
_Para todo_ resultado de competencia internacional, los puntos asignados deben ser exactamente `floor(puntos_base * 1.5)`, donde `puntos_base` son los puntos definidos en Requirement 4.3.
**Validates: Requirements 11.2**

**Property 41: Separación de rankings por tipo**
_Para todo_ practicante, su posición en el ranking nacional no debe verse afectada por sus resultados en competencias internacionales, y viceversa.
**Validates: Requirements 11.3**

**Property 42: Ranking internacional nulo sin resultados internacionales**
_Para todo_ practicante sin resultados en competencias internacionales, la consulta de su ranking internacional debe retornar `internationalPosition = null` sin error.
**Validates: Requirements 11.7**

---

### Módulo 12: Sistema Económico

#### Nuevos tipos de dominio

```typescript
// domain/entities/charge.ts
export type ChargeType =
  | "examen_grado"
  | "membresia_anual"
  | "licencia_competencia";
export type ChargeStatus = "pendiente" | "pagado" | "vencido" | "exento";
export type Currency = "CLP";

export interface Charge {
  id: string;
  practitionerId: string;
  chargeType: ChargeType;
  amount: number;
  currency: Currency;
  status: ChargeStatus;
  dueDate: string; // ISO date string
  periodLabel: string; // ej: "2025", "2025-Q1", "examen-2025-03"
  paidAt: string | null;
  paymentReference: string | null;
  exemptionReason: string | null;
  registeredBy: string; // adminId que creó el cobro
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
```

#### Nueva tabla

```sql
CREATE TABLE charges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id     UUID NOT NULL REFERENCES practitioners(id),
  charge_type         TEXT NOT NULL CHECK (charge_type IN (
                        'examen_grado', 'membresia_anual', 'licencia_competencia'
                      )),
  amount              NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency            TEXT NOT NULL DEFAULT 'CLP',
  status              TEXT NOT NULL DEFAULT 'pendiente'
                      CHECK (status IN ('pendiente', 'pagado', 'vencido', 'exento')),
  due_date            DATE NOT NULL,
  period_label        TEXT NOT NULL,
  paid_at             TIMESTAMPTZ,
  payment_reference   TEXT,
  exemption_reason    TEXT,
  registered_by       UUID NOT NULL REFERENCES auth.users(id),
  updated_by          UUID REFERENCES auth.users(id),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practitioner_read_own_charges" ON charges
  FOR SELECT USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "admin_all_charges" ON charges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

#### Nuevos contratos de repositorio

```typescript
// domain/interfaces/chargeRepository.ts
interface ChargeRepository {
  findById(id: string): Promise<Charge | null>;
  findByPractitioner(practitionerId: string): Promise<Charge[]>;
  findPendingByType(
    practitionerId: string,
    type: ChargeType,
  ): Promise<Charge[]>;
  save(charge: Charge): Promise<void>;
  updateStatus(
    id: string,
    status: ChargeStatus,
    adminId: string,
    meta?: {
      paidAt?: string;
      paymentReference?: string;
      exemptionReason?: string;
    },
  ): Promise<void>;
  markExpiredCharges(): Promise<number>; // retorna cantidad de cobros actualizados
}
```

#### Nuevos casos de uso

```typescript
// application/use-cases/
createCharge.ts; // Admin: crea cobro para un practicante
registerPayment.ts; // Admin: registra pago manual de un cobro
markChargeExempt.ts; // Admin: marca cobro como exento con justificación
expireOverdueCharges.ts; // Cron/interno: actualiza cobros vencidos
getPractitionerEconomicSummary.ts; // Retorna resumen económico del practicante
```

#### Nuevas Server Actions

```typescript
// presentation/actions/chargeActions.ts  ("use server")
createChargeAction(input: unknown): Promise<ActionResult<{ chargeId: string }>>
registerPaymentAction(input: unknown): Promise<ActionResult>
markChargeExemptAction(input: unknown): Promise<ActionResult>
getPractitionerEconomicSummaryAction(input: unknown): Promise<ActionResult<EconomicSummary>>
```

#### Nuevas propiedades de correctitud (Sistema Económico)

**Property 43: Transición de estado de cobro**
_Para todo_ cobro con `status = 'pendiente'` cuya `dueDate` sea anterior a la fecha actual, después de ejecutar `expireOverdueCharges`, su estado debe ser `vencido`.
**Validates: Requirements 12.4**

**Property 44: Bloqueo de certificación por cobro pendiente**
_Para todo_ intento de emitir una certificación de grado técnico cuando el practicante tiene un cobro de tipo `examen_grado` con estado `pendiente` o `vencido`, la operación debe ser rechazada.
**Validates: Requirements 12.5**

**Property 45: Round-trip de serialización de Cobro**
_Para todo_ objeto `Charge` válido, aplicar `toRow` seguido de `fromRow` debe producir un objeto equivalente al original en todos sus campos.
**Validates: Requirements 8.1 (extensión)**

---

### Módulo 13: Perfil Marcial Extendido

#### Nuevos tipos de dominio

```typescript
// domain/entities/disciplineGrade.ts
export type Discipline =
  | "kombat_taekwondo"
  | "taekwondo_wtf"
  | "hapkido"
  | "kick_boxing"
  | "defensa_personal";

export interface DisciplineGrade {
  id: string;
  practitionerId: string;
  discipline: Discipline;
  grade: Grade;
  dan: number | null;
  obtainedAt: string; // ISO date string
  certifyingMasterId: string | null;
  isActive: boolean; // false cuando fue superado por un grado posterior
  createdAt: string;
}
```

#### Nueva tabla

```sql
CREATE TABLE discipline_grades (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id       UUID NOT NULL REFERENCES practitioners(id),
  discipline            TEXT NOT NULL CHECK (discipline IN (
                          'kombat_taekwondo', 'taekwondo_wtf', 'hapkido',
                          'kick_boxing', 'defensa_personal'
                        )),
  grade                 TEXT NOT NULL,
  dan                   SMALLINT,
  obtained_at           DATE NOT NULL,
  certifying_master_id  UUID REFERENCES practitioners(id),
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Solo un grado activo por disciplina por practicante
  UNIQUE NULLS NOT DISTINCT (practitioner_id, discipline, is_active)
    WHERE is_active = true
);

ALTER TABLE discipline_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practitioner_read_own_grades" ON discipline_grades
  FOR SELECT USING (
    practitioner_id IN (
      SELECT id FROM practitioners WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_read_grades" ON discipline_grades
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_write_grades" ON discipline_grades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

#### Nuevos contratos de repositorio

```typescript
// domain/interfaces/disciplineGradeRepository.ts
interface DisciplineGradeRepository {
  findActiveByPractitioner(practitionerId: string): Promise<DisciplineGrade[]>;
  findHistoryByPractitionerAndDiscipline(
    practitionerId: string,
    discipline: Discipline,
  ): Promise<DisciplineGrade[]>;
  save(grade: DisciplineGrade): Promise<void>;
  deactivateCurrent(
    practitionerId: string,
    discipline: Discipline,
  ): Promise<void>;
}
```

#### Nuevos casos de uso

```typescript
// application/use-cases/
updateDisciplineGrade.ts; // Admin: actualiza grado en disciplina específica
getDisciplineGrades.ts; // Retorna todos los grados activos del practicante
getDisciplineGradeHistory.ts; // Retorna historial de grados por disciplina
```

#### Lógica de grado principal

```typescript
// domain/ — función pura
// El grado principal (practitioners.grade) se sincroniza automáticamente
// con el grado activo en discipline = 'kombat_taekwondo'
function derivePrimaryGrade(disciplineGrades: DisciplineGrade[]): Grade {
  const ktGrade = disciplineGrades.find(
    (dg) => dg.discipline === "kombat_taekwondo" && dg.isActive,
  );
  return ktGrade?.grade ?? "white";
}
```

#### Nuevas propiedades de correctitud (Perfil Marcial Extendido)

**Property 46: Unicidad de grado activo por disciplina**
_Para todo_ practicante y toda disciplina, no debe existir más de un registro `DisciplineGrade` con `isActive = true` para esa combinación.
**Validates: Requirements 13.3**

**Property 47: Grado principal derivado de kombat_taekwondo**
_Para todo_ practicante, el campo `grade` en su perfil principal debe ser igual al `grade` del registro `DisciplineGrade` activo con `discipline = 'kombat_taekwondo'`, si existe.
**Validates: Requirements 13.9**

**Property 48: Historial de grados por disciplina es inmutable**
_Para todo_ practicante y toda disciplina, después de actualizar el grado, el registro anterior debe seguir existiendo con `isActive = false`; el conteo total de registros para esa disciplina no debe disminuir.
**Validates: Requirements 13.5**

---

### Nuevas rutas Next.js (resumen de módulos 9–13)

```
src/app/
├── (dashboard)/
│   ├── admin/
│   │   ├── academies/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [academyId]/page.tsx
│   │   └── charges/
│   │       ├── page.tsx              # Resumen económico global
│   │       └── [practitionerId]/
│   │           └── page.tsx          # Cobros de un practicante
│   └── profile/
│       └── disciplines/
│           └── page.tsx              # Grados por disciplina del practicante autenticado
└── academies/
    └── page.tsx                      # Vista pública de academias activas
```

### Nuevos errores de dominio

```typescript
// modules/practitioner-identity/domain/errors/
export class InvalidRoleForGradeError extends DomainError {}
export class AcademyNotFoundError extends DomainError {}
export class AcademyInactiveError extends DomainError {}
export class PractitionerAlreadyInAcademyError extends DomainError {}
export class InvalidCertifyingMasterError extends DomainError {}
export class ChargeNotFoundError extends DomainError {}
export class ChargeAlreadyPaidError extends DomainError {}
export class PendingChargeBlocksCertificationError extends DomainError {}
export class DisciplineNotSupportedError extends DomainError {}
export class DuplicateActiveDisciplineGradeError extends DomainError {}
```

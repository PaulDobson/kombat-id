# Implementation Plan: Kombat Taekwondo Identity

## Overview

Implementación incremental del módulo `practitioner-identity` siguiendo Clean + Screaming Architecture sobre Next.js App Router con TypeScript. Cada tarea construye sobre la anterior, comenzando por el dominio puro y terminando con la integración completa de rutas y Server Actions.

## Tasks

- [x] 1. Scaffolding del módulo y tipos de dominio
  - Crear la estructura de carpetas `src/modules/practitioner-identity/` con todas las subcarpetas (`domain/entities`, `domain/interfaces`, `domain/value-objects`, `domain/errors`, `application/use-cases`, `infrastructure/repositories`, `presentation/actions`, `presentation/components`, `presentation/hooks`)
  - Crear `src/modules/practitioner-identity/domain/entities/practitioner.ts` con los tipos `Grade`, `Gender` e interfaz `Practitioner`
  - Crear `src/modules/practitioner-identity/domain/entities/martialHistoryEntry.ts` con `EventType` e interfaz `MartialHistoryEntry`
  - Crear `src/modules/practitioner-identity/domain/entities/ranking.ts` con `AgeRange`, `WeightCategory`, `RankingPosition` y `RankingSnapshot`
  - Crear `src/modules/practitioner-identity/domain/entities/certification.ts` con `CertType`, `PractitionerSnapshot` y `Certification`
  - Crear `src/modules/practitioner-identity/domain/errors/index.ts` con todas las clases de error de dominio extendiendo `DomainError`
  - _Requirements: 1.1, 1.2, 1.7, 3.1, 3.5, 4.1, 5.1, 5.3_

- [x] 2. Contratos de repositorios e interfaces de dominio
  - Crear `domain/interfaces/practitionerRepository.ts` con la interfaz `PractitionerRepository` completa
  - Crear `domain/interfaces/martialHistoryRepository.ts` con `MartialHistoryRepository`
  - Crear `domain/interfaces/rankingRepository.ts` con `RankingRepository`
  - Crear `domain/interfaces/certificationRepository.ts` con `CertificationRepository`
  - Crear `domain/interfaces/auditLogRepository.ts` con `AuditLogRepository` y tipo `AuditLogEntry`
  - Crear `domain/interfaces/qrScanRepository.ts` con `QrScanRepository`
  - _Requirements: 1.1, 3.1, 4.1, 5.1, 6.5, 7.6_

- [x] 3. Schema de base de datos y migraciones
  - Crear el schema Drizzle en `src/lib/db/schema.ts` (o extenderlo) con las tablas: `practitioners`, `martial_history`, `martial_events`, `ranking_positions`, `ranking_snapshots`, `certifications`, `qr_scan_events`, `admin_users`, `audit_log`
  - Incluir todas las constraints, checks y relaciones definidas en el diseño
  - Crear el archivo de migración SQL con las políticas RLS para cada tabla
  - _Requirements: 1.1, 1.3, 3.6, 4.1, 5.1, 6.1, 7.1_

- [ ] 4. Casos de uso: registro y gestión de perfil
  - [x] 4.1 Implementar `application/use-cases/registerPractitioner.ts`
    - Validar input con Zod (rut, fullName, birthDate, gender, grade, startDate, weightKg)
    - Verificar unicidad de RUT via repositorio antes de guardar
    - Generar `id` (UUID) y `qrToken` (UUID) en el caso de uso
    - Guardar practicante y retornar `{ publicId }`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7_

  - [ ]\* 4.2 Escribir property test para `registerPractitioner`
    - **Property 2: Completitud de campos del perfil tras el registro**
    - **Validates: Requirements 1.2**

  - [x] 4.3 Implementar `application/use-cases/updateContactInfo.ts`
    - Validar que el practicante existe y está activo
    - Permitir actualizar solo `contactPhone` y `contactEmail`
    - Actualizar `updatedAt` con timestamp actual
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 1.6_

  - [ ]\* 4.4 Escribir property tests para `updateContactInfo`
    - **Property 4: Monotonicidad de `updated_at` en actualizaciones de perfil**
    - **Property 5: Campos protegidos no modificables por no-admin**
    - **Property 7: Perfil inactivo es de solo lectura**
    - **Validates: Requirements 1.6, 2.3, 2.6**

  - [x] 4.5 Implementar `application/use-cases/updateProfilePhoto.ts`
    - Validar MIME type (`image/jpeg` | `image/png`) y tamaño máximo 5 MB
    - Subir archivo a Supabase Storage en path `{publicId}/{timestamp}.{ext}`
    - Actualizar `photoPath` en el perfil del practicante
    - _Requirements: 2.2, 2.4, 2.5_

  - [ ]\* 4.6 Escribir property test para `updateProfilePhoto`
    - **Property 6: Validación de foto de perfil**
    - **Validates: Requirements 2.4, 2.5**

- [x] 5. Checkpoint — Verificar dominio y casos de uso de perfil
  - Asegurar que todos los tests pasen, consultar al usuario si surgen dudas.

- [ ] 6. Casos de uso: historial marcial
  - [x] 6.1 Implementar `application/use-cases/addMartialHistoryEntry.ts`
    - Verificar que el practicante existe
    - Verificar que no existe entrada duplicada para `(practitionerId, eventId)` via repositorio
    - Crear entrada con `createdAt` y `recordedBy` (adminId)
    - _Requirements: 3.1, 3.2, 3.5, 3.6, 3.7_

  - [ ]\* 6.2 Escribir property tests para `addMartialHistoryEntry`
    - **Property 8: Completitud de campos en entradas del historial marcial**
    - **Property 11: Restricción de tipo de evento marcial**
    - **Property 12: Rechazo de entradas duplicadas en historial**
    - **Validates: Requirements 3.1, 3.5, 3.6**

  - [x] 6.3 Implementar lógica de corrección de entradas en `MartialHistoryRepository`
    - El método `markCorrected` debe setear `isCorrected = true`, `correctionNote`, `correctedAt` y `correctedBy`
    - Nunca eliminar la entrada original
    - _Requirements: 3.7_

  - [ ]\* 6.4 Escribir property test para inmutabilidad del historial
    - **Property 13: Inmutabilidad del historial marcial**
    - **Validates: Requirements 3.7**

- [ ] 7. Casos de uso: ranking
  - [x] 7.1 Implementar lógica de puntos en `domain/` (función pura `calculatePoints`)
    - `1st → 100`, `2nd → 70`, `3rd → 50`, `participant → 10`, otros → 0
    - _Requirements: 4.3_

  - [ ]\* 7.2 Escribir property tests para cálculo de puntos y categoría
    - **Property 14: Correctitud de categoría en el ranking**
    - **Property 15: Asignación correcta de puntos de ranking**
    - **Validates: Requirements 4.1, 4.3**

  - [x] 7.3 Implementar `application/use-cases/recalculateRanking.ts`
    - Obtener todos los practicantes activos de la categoría
    - Sumar puntos por resultados de competencia
    - Ordenar y asignar posiciones
    - Persistir en `ranking_positions` via repositorio
    - Excluir practicantes con `isActive = false`
    - _Requirements: 4.1, 4.2, 4.5, 4.6_

  - [ ]\* 7.4 Escribir property tests para ranking
    - **Property 16: Completitud de campos en la respuesta de ranking**
    - **Property 17: Practicantes inactivos excluidos del ranking**
    - **Property 18: Round-trip de snapshots de ranking**
    - **Validates: Requirements 4.4, 4.6, 4.7**

- [ ] 8. Casos de uso: certificaciones
  - [x] 8.1 Implementar `application/use-cases/issueCertification.ts`
    - Verificar rol admin del emisor
    - Capturar snapshot del perfil del practicante en el momento de emisión (`id`, `fullName`, `rut`, `grade`, `dan`, `snapshotAt`)
    - Guardar certificación con snapshot inmutable
    - _Requirements: 5.1, 5.2, 5.3, 5.8_

  - [ ]\* 8.2 Escribir property tests para `issueCertification`
    - **Property 19: Completitud de campos y tipos válidos en certificaciones**
    - **Property 22: Inmutabilidad del snapshot de certificación**
    - **Validates: Requirements 5.1, 5.3, 5.8**

  - [x] 8.3 Implementar `application/use-cases/revokeCertification.ts`
    - Verificar que la certificación existe y no está ya revocada
    - Setear `isRevoked = true`, `revokedAt`, `revocationReason`, `revokedBy`
    - Preservar la certificación en el historial (no eliminar)
    - _Requirements: 5.6, 5.7_

  - [ ]\* 8.4 Escribir property test para revocación
    - **Property 21: Transición de estado de revocación e inmutabilidad**
    - **Validates: Requirements 5.6, 5.7**

- [ ] 9. Casos de uso: verificación QR
  - [x] 9.1 Implementar `application/use-cases/verifyByQrToken.ts`
    - Buscar practicante por `qrToken`
    - Retornar `fullName`, `grade`, `isActive`, `photoPath` (URL firmada si existe)
    - Indicar explícitamente `isActive = false` si el practicante está inactivo
    - Registrar evento de escaneo en `qr_scan_events` con `scanned_at` (sin datos del verificador)
    - _Requirements: 6.2, 6.4, 6.5_

  - [ ]\* 9.2 Escribir property tests para verificación QR
    - **Property 23: Completitud de la respuesta de verificación por QR**
    - **Property 24: Registro de auditoría de escaneos QR**
    - **Validates: Requirements 6.2, 6.4, 6.5**

- [x] 10. Casos de uso: verificación pública de certificaciones
  - Implementar `application/use-cases/verifyCertification.ts`
  - Retornar nombre (del snapshot), tipo, fecha de emisión y estado (vigente/revocada)
  - No exponer RUT, `auth_user_id` ni datos de contacto
  - _Requirements: 5.5, 5.6_

- [ ] 11. Casos de uso administrativos
  - [x] 11.1 Implementar `application/use-cases/updatePractitionerGrade.ts`
    - Verificar rol admin
    - Si el nuevo grado tiene menor rango que el actual, requerir `justification` no vacía
    - Actualizar grado en el perfil
    - Crear entrada en historial marcial con `eventType = 'exam'`, `recordedBy = adminId`, `eventDate = today`
    - Registrar en `audit_log`
    - _Requirements: 7.1, 7.2, 7.5, 7.6_

  - [ ]\* 11.2 Escribir property tests para `updatePractitionerGrade`
    - **Property 26: Actualización de grado crea entrada de historial tipo examen**
    - **Property 29: Degradación de grado requiere justificación**
    - **Validates: Requirements 7.2, 7.5**

  - [x] 11.3 Implementar `application/use-cases/deactivatePractitioner.ts`
    - Verificar rol admin
    - Setear `isActive = false`, `deactivatedAt`, `deactivationReason`
    - Registrar en `audit_log`
    - _Requirements: 7.1, 7.3, 7.6_

  - [ ]\* 11.4 Escribir property test para desactivación
    - **Property 27: Transición de estado de desactivación**
    - **Validates: Requirements 7.3**

  - [x] 11.5 Implementar `application/use-cases/searchPractitioners.ts`
    - Aceptar query con campos opcionales: `name`, `rut`, `grade`
    - Delegar búsqueda al repositorio
    - _Requirements: 7.4_

  - [ ]\* 11.6 Escribir property test para búsqueda
    - **Property 28: Búsqueda retorna practicantes que coinciden con el criterio**
    - **Validates: Requirements 7.4**

  - [x] 11.7 Implementar `application/use-cases/regenerateQrToken.ts`
    - Verificar rol admin
    - Generar nuevo UUID como `qrToken`
    - Actualizar en BD y registrar en `audit_log`
    - _Requirements: 6.3, 7.1, 7.6_

  - [ ]\* 11.8 Escribir property test para operaciones admin rechazadas
    - **Property 25: Operaciones admin rechazadas para no-admins**
    - **Property 30: Acciones admin generan entradas en el log de auditoría**
    - **Validates: Requirements 7.1, 7.6**

- [x] 12. Checkpoint — Verificar todos los casos de uso
  - Asegurar que todos los tests pasen, consultar al usuario si surgen dudas.

- [ ] 13. Implementación de repositorios Drizzle/Supabase
  - [x] 13.1 Implementar `infrastructure/repositories/drizzlePractitionerRepository.ts`
    - Implementar todos los métodos de `PractitionerRepository`
    - Mapear filas de BD a entidades de dominio con `toEntity` / `toRow`
    - Validar schema con Zod en `fromRow` antes de retornar entidades
    - Marcar con `import "server-only"`
    - _Requirements: 1.1, 1.3, 1.5, 7.4, 8.1, 8.4, 8.5_

  - [ ]\* 13.2 Escribir property tests para `DrizzlePractitionerRepository`
    - **Property 1: Unicidad de identificadores de practicante**
    - **Property 3: El identificador público difiere del RUT**
    - **Property 31: Round-trip de serialización del Perfil**
    - **Property 33: Validación de schema en lectura de BD**
    - **Validates: Requirements 1.1, 1.3, 1.7, 8.2, 8.4, 8.5**

  - [x] 13.3 Implementar `infrastructure/repositories/drizzleMartialHistoryRepository.ts`
    - Implementar todos los métodos de `MartialHistoryRepository`
    - Retornar entradas ordenadas por `eventDate` descendente por defecto
    - Validar schema con Zod en lectura
    - Marcar con `import "server-only"`
    - _Requirements: 3.3, 3.4, 3.6, 3.7, 8.1, 8.4_

  - [ ]\* 13.4 Escribir property tests para `DrizzleMartialHistoryRepository`
    - **Property 9: Round-trip de inserción e isolación de datos del historial**
    - **Property 10: Historial marcial ordenado cronológicamente descendente**
    - **Property 13: Inmutabilidad del historial marcial**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.7**

  - [x] 13.5 Implementar `infrastructure/repositories/drizzleRankingRepository.ts`
    - Implementar todos los métodos de `RankingRepository`
    - Marcar con `import "server-only"`
    - _Requirements: 4.1, 4.2, 4.5, 4.7, 8.1_

  - [ ]\* 13.6 Escribir property tests para `DrizzleRankingRepository`
    - **Property 16: Completitud de campos en la respuesta de ranking**
    - **Property 17: Practicantes inactivos excluidos del ranking**
    - **Property 18: Round-trip de snapshots de ranking**
    - **Validates: Requirements 4.4, 4.6, 4.7**

  - [x] 13.7 Implementar `infrastructure/repositories/drizzleCertificationRepository.ts`
    - Implementar todos los métodos de `CertificationRepository`
    - Serializar/deserializar `practitionerSnapshot` JSONB correctamente
    - Retornar certificaciones ordenadas por `issuedAt` descendente
    - Validar schema con Zod en lectura
    - Marcar con `import "server-only"`
    - _Requirements: 5.1, 5.4, 5.6, 5.7, 8.1, 8.3, 8.4_

  - [ ]\* 13.8 Escribir property tests para `DrizzleCertificationRepository`
    - **Property 20: Certificaciones ordenadas por fecha de emisión descendente**
    - **Property 32: Round-trip de serialización de Certificación**
    - **Validates: Requirements 5.4, 8.3**

  - [x] 13.9 Implementar `infrastructure/repositories/drizzleAuditLogRepository.ts` y `drizzleQrScanRepository.ts`
    - Ambos marcados con `import "server-only"`
    - `QrScanRepository.recordScan` usa `supabaseAdmin` (service_role) para escritura sin auth
    - _Requirements: 6.5, 7.6_

- [ ] 14. Server Actions
  - [x] 14.1 Crear `presentation/actions/practitionerActions.ts` con `"use server"`
    - Implementar `registerPractitionerAction`, `updateProfilePhotoAction`, `updateContactInfoAction`
    - Cada action: verificar sesión → validar input con Zod → instanciar repositorios → llamar use case → retornar `ActionResult<T>`
    - Mapear errores de dominio a mensajes legibles en español
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 2.4, 2.5_

  - [x] 14.2 Crear `presentation/actions/adminActions.ts` con `"use server"`
    - Implementar `addMartialHistoryEntryAction`, `updatePractitionerGradeAction`, `issueCertificationAction`, `revokeCertificationAction`, `deactivatePractitionerAction`, `regenerateQrTokenAction`, `searchPractitionersAction`
    - Cada action verifica sesión Y rol admin antes de ejecutar
    - Registrar en `audit_log` tras cada operación exitosa
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 15. Checkpoint — Verificar Server Actions y repositorios
  - Asegurar que todos los tests pasen, consultar al usuario si surgen dudas.

- [x] 16. Rutas y Server Components del dashboard
  - [x] 16.1 Crear `src/app/(dashboard)/profile/page.tsx`
    - Server Component: obtener sesión → buscar practicante por `authUserId` → renderizar perfil
    - Pasar solo datos serializables a Client Components (fechas como ISO strings)
    - _Requirements: 2.1_

  - [x] 16.2 Crear `src/app/(dashboard)/profile/[publicId]/page.tsx`
    - Server Component: mostrar perfil de otro practicante autenticado
    - _Requirements: 2.1_

  - [x] 16.3 Crear `src/app/(dashboard)/martial-history/page.tsx`
    - Server Component: obtener historial del practicante autenticado ordenado desc
    - _Requirements: 3.3, 3.4_

  - [x] 16.4 Crear `src/app/(dashboard)/ranking/page.tsx`
    - Server Component: mostrar ranking por categoría del practicante autenticado
    - _Requirements: 4.4, 4.5_

  - [x] 16.5 Crear `src/app/(dashboard)/certifications/page.tsx`
    - Server Component: listar certificaciones del practicante autenticado ordenadas desc
    - _Requirements: 5.4_

- [x] 17. Rutas y Server Components de administración
  - [x] 17.1 Crear `src/app/(dashboard)/admin/practitioners/page.tsx`
    - Server Component con búsqueda por nombre/RUT/grado
    - Verificar rol admin server-side; redirigir si no autorizado
    - _Requirements: 7.1, 7.4_

  - [x] 17.2 Crear `src/app/(dashboard)/admin/practitioners/new/page.tsx`
    - Formulario de registro de practicante
    - Llama a `registerPractitionerAction`
    - _Requirements: 1.1, 1.2, 7.1_

  - [x] 17.3 Crear `src/app/(dashboard)/admin/practitioners/[publicId]/page.tsx` y sub-rutas (`grade/`, `certifications/new/`)
    - Detalle admin con acciones de actualizar grado, emitir/revocar certificación, desactivar
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [x] 17.4 Crear `src/app/(dashboard)/admin/events/page.tsx` y `new/page.tsx`
    - Gestión de eventos marciales
    - _Requirements: 3.1, 7.1_

- [x] 18. Rutas públicas de verificación
  - [x] 18.1 Crear `src/app/verify/qr/[token]/page.tsx`
    - Server Component público (sin auth): llamar `verifyByQrToken` use case
    - Mostrar `fullName`, `grade`, `isActive`, foto de perfil
    - Indicar claramente estado inactivo si aplica
    - _Requirements: 6.2, 6.4_

  - [x] 18.2 Crear `src/app/api/qr/[token]/route.ts`
    - API Route Handler JSON para apps de escaneo QR
    - Misma lógica que la página, retorna JSON
    - _Requirements: 6.2, 6.4, 6.5_

  - [x] 18.3 Crear `src/app/verify/cert/[certId]/page.tsx`
    - Server Component público: mostrar estado de certificación (vigente/revocada)
    - No exponer RUT, `auth_user_id` ni datos de contacto
    - _Requirements: 5.5, 5.6_

  - [x] 18.4 Actualizar `src/middleware.ts` para excluir `/verify` de la protección de autenticación
    - Agregar `/verify` a `PUBLIC_ROUTES`
    - _Requirements: 6.2, 5.5_

- [x] 19. Generación de QR en Server Component
  - Instalar `qrcode` y `@types/qrcode`
  - Crear componente Server `presentation/components/PractitionerQrCode.tsx`
  - Generar QR como Data URL PNG on-demand con la URL `https://{domain}/verify/qr/{qrToken}`
  - Integrar en la página de perfil del practicante
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 20. Checkpoint final — Integración completa
  - Asegurar que todos los tests pasen, consultar al usuario si surgen dudas.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los property tests usan `fast-check` con mínimo 100 iteraciones (`{ numRuns: 100 }`)
- Los repositorios Drizzle son el único lugar donde se importa `db` de `@/lib/db`
- Las Server Actions son el único lugar donde se instancian repositorios
- Todos los archivos de infraestructura deben incluir `import "server-only"`

---

## Nuevos Módulos — Ecosistema Nacional de Kombat Taekwondo Chile

- [x] 21. Módulo: Sistema Jerárquico de Roles
  - [x] 21.1 Extender entidad `Practitioner` con campos `role: PractitionerRole` y `ageCategory: AgeCategory`
    - Agregar tipos `PractitionerRole` y `AgeCategory` en `domain/entities/practitioner.ts`
    - Agregar función pura `deriveAgeCategory(birthDate: string): AgeCategory` en `domain/`
    - Agregar función pura `validateRoleForGrade(role, grade, dan): boolean` en `domain/`
    - _Requirements: 9.1, 9.2, 9.8, 9.9, 9.10_

  - [x] 21.2 Crear entidad `MasterLineageEntry` y su interfaz de repositorio
    - Crear `domain/entities/masterLineage.ts`
    - Crear `domain/interfaces/masterLineageRepository.ts`
    - _Requirements: 9.4, 9.6_

  - [x] 21.3 Migración de BD: columnas `role` y `age_category` en `practitioners`, tabla `master_lineage`
    - Agregar columna `role` con CHECK constraint en `practitioners`
    - Agregar columna `age_category` como columna generada en `practitioners`
    - Crear tabla `master_lineage` con RLS
    - _Requirements: 9.1, 9.2, 9.4_

  - [x] 21.4 Implementar `application/use-cases/updatePractitionerRole.ts`
    - Verificar rol admin
    - Validar restricciones de grado antes de promover (`validateRoleForGrade`)
    - Registrar en `audit_log`
    - _Requirements: 9.1, 9.8, 9.9, 9.10_

  - [x] 21.5 Implementar `application/use-cases/getMasterLineage.ts`
    - Retornar cadena completa de maestros certificadores para un practicante
    - _Requirements: 9.6_

  - [x] 21.6 Extender `issueCertification` para requerir `certifyingMasterId` en certificaciones de grado técnico
    - Validar que el maestro certificador existe y tiene rol `maestro` o `profesor`
    - Crear entrada en `master_lineage` al emitir la certificación
    - _Requirements: 9.5, 9.7_

  - [ ]\* 21.7 Escribir property tests para roles y línea de maestros
    - **Property 34: Restricciones de rol por grado**
    - **Property 35: Categoría de edad derivada de fecha de nacimiento**
    - **Property 36: Maestro certificador válido en línea de maestros**
    - **Validates: Requirements 9.2, 9.7, 9.8, 9.9, 9.10**

- [x] 22. Módulo: Red Nacional de Academias
  - [x] 22.1 Crear entidades `Academy` y `AcademyMembership` con sus interfaces de repositorio
    - Crear `domain/entities/academy.ts` con tipos `Academy`, `ChileanRegion`, `AcademyMembership`
    - Crear `domain/interfaces/academyRepository.ts`
    - Crear `domain/interfaces/academyMembershipRepository.ts`
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 22.2 Migración de BD: tablas `academies` y `academy_memberships` con RLS
    - _Requirements: 10.1, 10.2, 10.5_

  - [x] 22.3 Implementar `infrastructure/repositories/drizzleAcademyRepository.ts`
    - Implementar todos los métodos de `AcademyRepository`
    - Marcar con `import "server-only"`
    - _Requirements: 10.1, 10.8, 10.10_

  - [x] 22.4 Implementar `infrastructure/repositories/drizzleAcademyMembershipRepository.ts`
    - Implementar todos los métodos de `AcademyMembershipRepository`
    - Marcar con `import "server-only"`
    - _Requirements: 10.4, 10.5_

  - [x] 22.5 Implementar casos de uso de academias
    - `application/use-cases/createAcademy.ts` — Admin: valida instructores responsables
    - `application/use-cases/deactivateAcademy.ts` — Admin: desactiva academia
    - `application/use-cases/assignPractitionerToAcademy.ts` — valida academia activa y membresía única
    - `application/use-cases/removePractitionerFromAcademy.ts`
    - _Requirements: 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 22.6 Crear `presentation/actions/academyActions.ts` con `"use server"`
    - Implementar `createAcademyAction`, `deactivateAcademyAction`, `assignPractitionerToAcademyAction`, `removePractitionerFromAcademyAction`, `searchAcademiesAction`
    - _Requirements: 10.1, 10.6, 10.8_

  - [x] 22.7 Crear rutas de administración de academias
    - `src/app/(dashboard)/admin/academies/page.tsx` — listado y búsqueda
    - `src/app/(dashboard)/admin/academies/new/page.tsx` — registro
    - `src/app/(dashboard)/admin/academies/[academyId]/page.tsx` — detalle y gestión
    - _Requirements: 10.1, 10.8_

  - [x] 22.8 Crear ruta pública de academias activas
    - `src/app/academies/page.tsx` — Server Component sin auth
    - Mostrar nombre, región, ciudad e instructores responsables
    - No exponer datos de contacto privados
    - Actualizar `middleware.ts` para excluir `/academies` de protección
    - _Requirements: 10.9_

  - [ ]\* 22.9 Escribir property tests para academias
    - **Property 37: Unicidad de membresía activa por practicante**
    - **Property 38: Rechazo de membresía en academia inactiva**
    - **Property 39: Conteo de practicantes activos en academia**
    - **Validates: Requirements 10.5, 10.7, 10.10**

- [ ] 23. Módulo: Ranking Internacional
  - [x] 23.1 Extender entidades de dominio para ranking internacional
    - Agregar `EventScope` y campos `eventScope`, `eventCountry` a `MartialHistoryEntry`
    - Agregar `RankingType` y campos de ranking internacional/combinado a `RankingPosition`
    - Agregar función pura `calculateInternationalPoints(basePoints: number): number`
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 23.2 Migración de BD: columnas `event_scope` y `event_country` en `martial_history`, columnas de ranking internacional en `ranking_positions`
    - _Requirements: 11.1, 11.6_

  - [x] 23.3 Extender `recalculateRanking` para calcular los tres tipos de ranking
    - Ranking nacional: solo `event_scope = 'national'`
    - Ranking internacional: solo `event_scope = 'international'` con multiplicador 1.5x
    - Ranking combinado: suma de puntos nacionales e internacionales
    - _Requirements: 11.2, 11.3, 11.4_

  - [x] 23.4 Extender `application/use-cases/addMartialHistoryEntry.ts` para aceptar `eventScope` y `eventCountry`
    - Validar que `eventCountry` sea obligatorio cuando `eventScope = 'international'`
    - _Requirements: 11.1, 11.6_

  - [ ]\* 23.5 Escribir property tests para ranking internacional
    - **Property 40: Multiplicador de puntos internacionales**
    - **Property 41: Separación de rankings por tipo**
    - **Property 42: Ranking internacional nulo sin resultados internacionales**
    - **Validates: Requirements 11.2, 11.3, 11.7**

- [ ] 24. Módulo: Sistema Económico
  - [x] 24.1 Crear entidad `Charge` y su interfaz de repositorio
    - Crear `domain/entities/charge.ts` con tipos `ChargeType`, `ChargeStatus`, `Currency`, `Charge`
    - Crear `domain/interfaces/chargeRepository.ts`
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 24.2 Migración de BD: tabla `charges` con RLS
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 24.3 Implementar `infrastructure/repositories/drizzleChargeRepository.ts`
    - Implementar todos los métodos de `ChargeRepository`
    - Marcar con `import "server-only"`
    - _Requirements: 12.1, 12.4_

  - [x] 24.4 Implementar casos de uso económicos
    - `application/use-cases/createCharge.ts` — Admin: crea cobro
    - `application/use-cases/registerPayment.ts` — Admin: registra pago manual
    - `application/use-cases/markChargeExempt.ts` — Admin: exención con justificación obligatoria
    - `application/use-cases/expireOverdueCharges.ts` — Interno: actualiza cobros vencidos
    - `application/use-cases/getPractitionerEconomicSummary.ts`
    - _Requirements: 12.3, 12.4, 12.7, 12.8, 12.10_

  - [x] 24.5 Extender `issueCertification` para verificar cobros pendientes
    - Antes de emitir certificación de grado técnico, verificar que no exista cobro `examen_grado` con estado `pendiente` o `vencido`
    - _Requirements: 12.5_

  - [x] 24.6 Crear `presentation/actions/chargeActions.ts` con `"use server"`
    - Implementar `createChargeAction`, `registerPaymentAction`, `markChargeExemptAction`, `getPractitionerEconomicSummaryAction`
    - _Requirements: 12.7, 12.8, 12.10_

  - [x] 24.7 Crear rutas de gestión económica
    - `src/app/(dashboard)/admin/charges/page.tsx` — resumen económico global
    - `src/app/(dashboard)/admin/charges/[practitionerId]/page.tsx` — cobros de un practicante
    - _Requirements: 12.10_

  - [ ]\* 24.8 Escribir property tests para sistema económico
    - **Property 43: Transición de estado de cobro**
    - **Property 44: Bloqueo de certificación por cobro pendiente**
    - **Property 45: Round-trip de serialización de Cobro**
    - **Validates: Requirements 12.4, 12.5**

- [ ] 25. Módulo: Perfil Marcial Extendido
  - [x] 25.1 Crear entidad `DisciplineGrade` y su interfaz de repositorio
    - Crear `domain/entities/disciplineGrade.ts` con tipos `Discipline`, `DisciplineGrade`
    - Crear `domain/interfaces/disciplineGradeRepository.ts`
    - Agregar función pura `derivePrimaryGrade(disciplineGrades: DisciplineGrade[]): Grade`
    - _Requirements: 13.1, 13.2, 13.9_

  - [x] 25.2 Migración de BD: tabla `discipline_grades` con RLS y constraint de unicidad de grado activo
    - _Requirements: 13.1, 13.3_

  - [x] 25.3 Implementar `infrastructure/repositories/drizzleDisciplineGradeRepository.ts`
    - Implementar todos los métodos de `DisciplineGradeRepository`
    - Marcar con `import "server-only"`
    - _Requirements: 13.1, 13.5_

  - [x] 25.4 Implementar casos de uso de perfil marcial extendido
    - `application/use-cases/updateDisciplineGrade.ts` — Admin: desactiva grado anterior, crea nuevo, registra en historial marcial con disciplina, sincroniza `practitioners.grade` si disciplina es `kombat_taekwondo`
    - `application/use-cases/getDisciplineGrades.ts`
    - `application/use-cases/getDisciplineGradeHistory.ts`
    - _Requirements: 13.1, 13.4, 13.5, 13.6, 13.7, 13.9_

  - [x] 25.5 Extender Server Action `updatePractitionerGradeAction` para aceptar disciplina opcional
    - Si se especifica disciplina, delegar a `updateDisciplineGrade`
    - Si no se especifica, comportamiento existente (solo `kombat_taekwondo`)
    - _Requirements: 13.4, 13.7_

  - [x] 25.6 Crear ruta de grados por disciplina
    - `src/app/(dashboard)/profile/disciplines/page.tsx` — Server Component
    - Mostrar todos los `DisciplineGrade` activos del practicante autenticado ordenados por disciplina
    - _Requirements: 13.6_

  - [ ]\* 25.7 Escribir property tests para perfil marcial extendido
    - **Property 46: Unicidad de grado activo por disciplina**
    - **Property 47: Grado principal derivado de kombat_taekwondo**
    - **Property 48: Historial de grados por disciplina es inmutable**
    - **Validates: Requirements 13.3, 13.5, 13.9**

- [x] 26. Checkpoint — Verificar nuevos módulos
  - Asegurar que todos los tests de los módulos 21–25 pasen
  - Verificar que las migraciones de BD son compatibles con el schema existente
  - Consultar al usuario si surgen dudas sobre integraciones entre módulos

## Notes (actualizadas)

- Los módulos 21–25 son independientes entre sí salvo las dependencias explícitas: Módulo 13 depende de Módulo 9 (línea de maestros), Módulo 12 depende del flujo de certificaciones existente
- Las tareas marcadas con `*` son opcionales para MVP
- El módulo 12 (Sistema Económico) no implementa pasarela de pago; solo modelo de datos y estados
- Las columnas generadas de PostgreSQL (`age_category`) no requieren lógica en la capa de aplicación
- Todos los nuevos repositorios deben incluir `import "server-only"`
- Las nuevas Server Actions siguen el mismo patrón `ActionResult<T>` del spec original

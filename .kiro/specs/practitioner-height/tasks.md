# Plan de implementación: practitioner-height

## Descripción general

Agregar el atributo `height_cm` (estatura en centímetros) al perfil de un practicante, siguiendo el mismo patrón ya establecido para `weight_kg`. El cambio recorre todas las capas de Clean Architecture de adentro hacia afuera: migración SQL → tipos DB → entidad de dominio → repositorio de infraestructura → use case de registro → página de detalle del administrador.

El proyecto usa **TypeScript**, **Next.js App Router**, **Supabase/PostgreSQL**, **Zod** y **Vitest + fast-check** para los tests de propiedad.

## Tareas

- [x] 1. Crear la migración SQL para agregar `height_cm`
  - Crear el archivo `src/lib/db/migrations/032_practitioner_height.sql`
  - Agregar la columna `height_cm SMALLINT` con restricción `CHECK (height_cm BETWEEN 50 AND 250)` y `IF NOT EXISTS` para idempotencia
  - La columna debe ser nullable para no afectar filas existentes ni requerir un valor por defecto
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1_

- [x] 2. Actualizar los tipos TypeScript de base de datos
  - Modificar `src/types/database.types.ts`
  - Agregar `height_cm: number | null` en el tipo `Row` de la tabla `practitioners`, junto a `weight_kg`
  - Agregar `height_cm?: number | null` en los tipos `Insert` y `Update` de la tabla `practitioners`
  - _Requirements: 2.1, 2.2_

- [x] 3. Agregar `heightCm` a la entidad de dominio `Practitioner`
  - Modificar `src/modules/practitioner-identity/domain/entities/practitioner.ts`
  - Agregar el campo `heightCm: number | null` a la interfaz `Practitioner`, inmediatamente después de `weightKg`
  - No se requieren cambios en funciones auxiliares (`deriveAgeCategory`, `validateRoleForGrade`)
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Actualizar el repositorio de infraestructura `DrizzlePractitionerRepository`
  - Modificar `src/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository.ts`
  - [x] 4.1 Agregar `height_cm` a `PractitionerRowSchema` con validación `z.number().int().min(50).max(250).nullable().optional()`
    - Colocar la entrada junto a `weight_kg` en el schema
    - _Requirements: 4.1, 4.6_

  - [x] 4.2 Mapear `height_cm` → `heightCm` en `toEntity()`
    - Usar `row.height_cm ?? null` para manejar filas antiguas sin el campo
    - _Requirements: 4.2, 4.3, 8.1_

  - [x] 4.3 Mapear `heightCm` → `height_cm` en `toRow()`
    - Asignar `height_cm: practitioner.heightCm` en el objeto de inserción
    - _Requirements: 4.4, 4.5_

  - [ ]\* 4.4 Escribir tests de propiedad para el repositorio
    - **Property 2: Round-trip de mapeo — preservación del valor de estatura**
    - Para cualquier entero `n` en [50, 250] y para `null`, verificar que `toEntity(toRow({ ...practitioner, heightCm: n })).heightCm === n`
    - Crear el archivo `src/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository.height.test.ts`
    - Usar `fc.integer({ min: 50, max: 250 })` y `fc.constant(null)` con `fc.oneof`
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 8.1**

- [x] 5. Checkpoint — Verificar que los tipos compilan sin errores
  - Ejecutar `pnpm type-check` y confirmar que no hay errores de TypeScript en los archivos modificados hasta este punto
  - Asegurarse de que todos los tests existentes siguen pasando con `pnpm vitest --run`

- [x] 6. Actualizar el use case `registerPractitioner`
  - Modificar `src/modules/practitioner-identity/application/use-cases/registerPractitioner.ts`
  - [x] 6.1 Agregar `heightCm` a `RegisterPractitionerInputSchema`
    - Agregar `heightCm: z.number().int().min(50).max(250).optional()` junto a `weightKg`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.2 Asignar `heightCm` al construir la entidad `Practitioner`
    - Agregar `heightCm: validated.heightCm ?? null` en el objeto `practitioner`, junto a `weightKg`
    - _Requirements: 5.4, 5.5_

  - [ ]\* 6.3 Escribir tests de propiedad para el use case
    - **Property 1: Validación de rango — rechazo de valores fuera de [50, 250]**
    - Para cualquier entero `n` fuera del rango [50, 250] (es decir, `n < 50` o `n > 250`), verificar que `RegisterPractitionerInputSchema.safeParse({ ...validInput, heightCm: n }).success === false`
    - Para cualquier entero `n` en [50, 250], verificar que `safeParse` retorna `success: true` con `heightCm === n`
    - Crear el archivo `src/modules/practitioner-identity/application/use-cases/registerPractitioner.height.test.ts`
    - Usar `fc.integer({ min: -1000, max: 49 })` y `fc.integer({ min: 251, max: 1000 })` para valores inválidos
    - **Validates: Requirements 3.2, 4.6, 5.2, 5.3, 7.3**

- [x] 7. Actualizar la página de detalle del practicante
  - Modificar `src/app/(dashboard)/admin/practitioners/[publicId]/page.tsx`
  - Agregar el bloque condicional `{practitioner.heightCm && (<Field label="Estatura" value={`${practitioner.heightCm} cm`} />)}` inmediatamente después del bloque equivalente de `weightKg` en la sección "Datos personales"
  - No se requieren cambios en la lógica de fetching ni en otros componentes; la página es un Server Component que ya recibe la entidad completa
  - _Requirements: 6.1, 6.2, 6.3, 7.2, 8.2_

  - [ ]\* 7.1 Escribir tests de propiedad para la visualización
    - **Property 3: Formato de visualización — presencia del valor en la UI**
    - Para cualquier entero `n` en [50, 250], verificar que el string `"${n} cm"` está presente en el HTML renderizado cuando `heightCm = n`
    - Verificar que cuando `heightCm = null` el campo "Estatura" no aparece en el HTML
    - Crear el archivo `src/app/(dashboard)/admin/practitioners/[publicId]/page.height.test.ts`
    - Usar `fc.integer({ min: 50, max: 250 })` para valores válidos
    - **Validates: Requirements 6.1, 6.2**

- [x] 8. Checkpoint final — Verificar que todo compila y los tests pasan
  - Ejecutar `pnpm type-check` para confirmar que no hay errores de TypeScript en ningún archivo modificado
  - Ejecutar `pnpm vitest --run` para confirmar que todos los tests (incluyendo los nuevos) pasan correctamente

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- El orden de las tareas sigue el flujo de dependencias de Clean Architecture: de la capa más interna (dominio/DB) hacia la más externa (presentación)
- Cada tarea referencia los requisitos específicos que implementa para trazabilidad
- Los tests de propiedad usan `fast-check` (ya instalado como devDependency) y `vitest` como runner
- La migración `032_practitioner_height.sql` sigue la numeración del último archivo existente (`031c_event_storage_policies_fix.sql`)
- No se requieren nuevas dependencias externas; todos los patrones reutilizan lo ya establecido para `weight_kg`

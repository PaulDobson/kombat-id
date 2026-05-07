# Documento de Requisitos: practitioner-height

## Introducción

Esta funcionalidad agrega el atributo de estatura (`height_cm`) al perfil de un practicante. El cambio abarca todas las capas de la arquitectura: migración de base de datos, tipos TypeScript, entidad de dominio, repositorio de infraestructura, use case de registro y página de detalle del administrador. El objetivo es permitir almacenar y visualizar la estatura de cada practicante de forma opcional, siguiendo el mismo patrón ya establecido para el campo `weight_kg`.

## Glosario

- **Practitioner**: Entidad de dominio que representa a un alumno o practicante registrado en el sistema.
- **PractitionerRepository**: Interfaz de dominio que define las operaciones de persistencia sobre `Practitioner`.
- **DrizzlePractitionerRepository**: Implementación concreta de `PractitionerRepository` usando Drizzle ORM.
- **PractitionerRowSchema**: Esquema Zod que valida las filas crudas devueltas por la base de datos antes de mapearlas a la entidad de dominio.
- **RegisterPractitioner_UseCase**: Use case de aplicación responsable de crear un nuevo `Practitioner` en el sistema.
- **DetailPage**: Página de detalle del practicante en el panel de administración (`/admin/practitioners/[publicId]`).
- **height_cm**: Nombre de la columna en la base de datos (snake_case). Almacena la estatura en centímetros como `SMALLINT` nullable.
- **heightCm**: Nombre del campo en la entidad de dominio y en los esquemas de aplicación (camelCase).
- **VALIDATION_ERROR**: Código de error estructurado devuelto por un Server Action cuando la entrada no supera la validación Zod.

---

## Requisitos

### Requisito 1: Migración de base de datos

**User Story:** Como administrador del sistema, quiero que la base de datos almacene la estatura de los practicantes, para poder persistir este dato biométrico de forma segura y consistente.

#### Criterios de aceptación

1. THE Sistema SHALL agregar la columna `height_cm` de tipo `SMALLINT` a la tabla `practitioners` mediante una migración SQL idempotente.
2. THE Sistema SHALL aplicar una restricción `CHECK (height_cm BETWEEN 50 AND 250)` a la columna `height_cm` en la base de datos.
3. THE Sistema SHALL definir la columna `height_cm` como nullable, de modo que su ausencia no invalide filas existentes.
4. WHEN la migración se ejecuta más de una vez, THE Sistema SHALL completar la operación sin errores gracias al uso de `IF NOT EXISTS`.

---

### Requisito 2: Tipos de base de datos TypeScript

**User Story:** Como desarrollador, quiero que los tipos TypeScript reflejen la nueva columna `height_cm`, para que el compilador detecte usos incorrectos del campo en tiempo de compilación.

#### Criterios de aceptación

1. THE Sistema SHALL incluir el campo `height_cm: number | null` en el tipo `Row` de la tabla `practitioners` dentro de `database.types.ts`.
2. THE Sistema SHALL incluir el campo `height_cm?: number | null` en los tipos `Insert` y `Update` de la tabla `practitioners` dentro de `database.types.ts`.

---

### Requisito 3: Entidad de dominio

**User Story:** Como desarrollador, quiero que la entidad de dominio `Practitioner` exponga el campo `heightCm`, para que las capas de aplicación y presentación puedan acceder a la estatura sin depender de tipos de infraestructura.

#### Criterios de aceptación

1. THE Sistema SHALL agregar el campo `heightCm: number | null` a la interfaz `Practitioner` en la capa de dominio.
2. WHILE `heightCm` tiene un valor numérico, THE Sistema SHALL garantizar que dicho valor es un entero entre 50 y 250 (inclusive).
3. THE Sistema SHALL permitir que `heightCm` sea `null` para representar que la estatura no ha sido registrada.

---

### Requisito 4: Repositorio de infraestructura — mapeo de datos

**User Story:** Como desarrollador, quiero que el repositorio Drizzle mapee correctamente `height_cm` (snake_case) a `heightCm` (camelCase) y viceversa, para mantener la separación entre el modelo de base de datos y la entidad de dominio.

#### Criterios de aceptación

1. THE DrizzlePractitionerRepository SHALL incluir el campo `height_cm` en `PractitionerRowSchema` con validación Zod `z.number().int().min(50).max(250).nullable().optional()`.
2. WHEN `toEntity()` recibe una fila con `height_cm` igual a `null` o ausente, THE DrizzlePractitionerRepository SHALL asignar `null` al campo `heightCm` de la entidad resultante.
3. WHEN `toEntity()` recibe una fila con un valor numérico en `height_cm`, THE DrizzlePractitionerRepository SHALL asignar ese mismo valor al campo `heightCm` de la entidad resultante.
4. WHEN `toRow()` recibe una entidad con `heightCm` definido, THE DrizzlePractitionerRepository SHALL asignar ese valor al campo `height_cm` del objeto de inserción resultante.
5. WHEN `toRow()` recibe una entidad con `heightCm` igual a `null`, THE DrizzlePractitionerRepository SHALL asignar `null` al campo `height_cm` del objeto de inserción resultante.
6. IF `PractitionerRowSchema` recibe un valor en `height_cm` fuera del rango [50, 250], THEN THE DrizzlePractitionerRepository SHALL rechazar la fila con un error de validación Zod.

---

### Requisito 5: Use case de registro de practicante

**User Story:** Como administrador, quiero poder registrar la estatura de un practicante al momento de crearlo, para capturar este dato biométrico desde el inicio sin necesidad de una edición posterior.

#### Criterios de aceptación

1. THE RegisterPractitioner_UseCase SHALL aceptar el campo `heightCm` como parámetro de entrada opcional en `RegisterPractitionerInputSchema`.
2. WHEN `heightCm` es proporcionado en la entrada, THE RegisterPractitioner_UseCase SHALL validar que el valor es un entero entre 50 y 250 (inclusive) antes de persistir el practicante.
3. IF `heightCm` es proporcionado con un valor fuera del rango [50, 250], THEN THE RegisterPractitioner_UseCase SHALL rechazar la operación y retornar `{ success: false, error: "Invalid input", code: "VALIDATION_ERROR" }`.
4. WHEN `heightCm` no es proporcionado en la entrada, THE RegisterPractitioner_UseCase SHALL asignar `null` al campo `heightCm` de la entidad `Practitioner` creada.
5. WHEN `heightCm` es proporcionado con un valor válido, THE RegisterPractitioner_UseCase SHALL asignar ese valor al campo `heightCm` de la entidad `Practitioner` creada.

---

### Requisito 6: Visualización en la página de detalle del practicante

**User Story:** Como administrador, quiero ver la estatura del practicante en su ficha de detalle, para tener acceso rápido a sus datos biométricos sin necesidad de consultar la base de datos directamente.

#### Criterios de aceptación

1. WHEN `practitioner.heightCm` tiene un valor numérico, THE DetailPage SHALL mostrar el campo "Estatura" con el formato `{heightCm} cm` en la sección de datos personales.
2. WHEN `practitioner.heightCm` es `null`, THE DetailPage SHALL omitir el campo "Estatura" de la sección de datos personales, sin mostrar un campo vacío.
3. THE DetailPage SHALL mostrar el campo "Estatura" en la misma sección de datos personales donde se muestra el campo "Peso", siguiendo el mismo patrón visual.

---

### Requisito 7: Seguridad y privacidad del dato biométrico

**User Story:** Como responsable de privacidad, quiero que la estatura del practicante esté protegida por las mismas políticas de acceso que el resto de sus datos personales, para cumplir con los principios de protección de datos biométricos.

#### Criterios de aceptación

1. THE Sistema SHALL aplicar las políticas RLS (Row Level Security) existentes de la tabla `practitioners` al campo `height_cm`, de modo que solo el propio practicante y los administradores puedan leer o escribir el dato.
2. THE Sistema SHALL excluir `heightCm` de cualquier respuesta pública, incluyendo el endpoint de verificación QR.
3. THE Sistema SHALL validar el valor de `heightCm` mediante Zod en el use case antes de que el dato llegue a la base de datos, previniendo la inyección de valores maliciosos.

---

### Requisito 8: Compatibilidad con datos existentes

**User Story:** Como administrador del sistema, quiero que los practicantes registrados antes de esta funcionalidad no se vean afectados, para garantizar la continuidad del servicio sin necesidad de migrar datos históricos.

#### Criterios de aceptación

1. WHEN el repositorio lee una fila de `practitioners` que no contiene el campo `height_cm` (fila anterior a la migración), THE DrizzlePractitionerRepository SHALL mapear `heightCm` a `null` sin lanzar un error.
2. WHEN la DetailPage recibe un `Practitioner` con `heightCm` igual a `null`, THE DetailPage SHALL renderizar la ficha completa sin mostrar el campo "Estatura", manteniendo el resto de la información intacta.

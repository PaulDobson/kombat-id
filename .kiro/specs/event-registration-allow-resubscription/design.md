# Design Document — Allow Re-subscription After Cancellation

## 1. Architecture Overview

Este bugfix modifica únicamente la capa de aplicación (use case) y la capa de infraestructura (repository) del módulo `event-registration`. No requiere cambios en la presentación (UI) ni en las server actions.

**Affected Layers:**

```
src/modules/event-registration/
├── domain/
│   └── interfaces/eventRegistrationRepository.ts   ← Añadir nuevo método
├── application/
│   └── use-cases/enrollStudents.ts                 ← Usar nuevo método
└── infrastructure/
    └── repositories/drizzleEventRegistrationRepository.ts  ← Implementar nuevo método
```

**Unchanged Layers:**

- `presentation/actions/enrollStudentsAction.ts` (sin cambios)
- `presentation/components/EnrollForm.tsx` (sin cambios)
- `domain/entities/eventRegistration.ts` (sin cambios)

## 2. Domain Layer Changes

### 2.1 Repository Interface Extension

**File:** `src/modules/event-registration/domain/interfaces/eventRegistrationRepository.ts`

**Change:** Añadir nuevo método a la interfaz `IEventRegistrationRepository`

```typescript
export interface IEventRegistrationRepository {
  // ... métodos existentes
  findByPractitionerAndEvent(
    practitionerId: string,
    eventId: string,
  ): Promise<EventRegistration | null>;

  // NUEVO MÉTODO
  /**
   * Busca un registro activo (no cancelado) de un practicante en un evento.
   * Retorna null si no existe registro o si el registro existente está cancelado.
   *
   * @param practitionerId - UUID del practicante
   * @param eventId - UUID del evento
   * @returns EventRegistration activo o null
   */
  findActiveByPractitionerAndEvent(
    practitionerId: string,
    eventId: string,
  ): Promise<EventRegistration | null>;

  // ... métodos existentes
}
```

**Semantic Contract:**

- `findActiveByPractitionerAndEvent` retorna un registro solo si `status` es `"confirmada"` o `"pendiente_pago"`
- Retorna `null` si no existe registro o si el registro tiene `status: "cancelada"`
- El método original `findByPractitionerAndEvent` se mantiene sin cambios para acceso a registros históricos

## 3. Application Layer Changes

### 3.1 Use Case: enrollStudents

**File:** `src/modules/event-registration/application/use-cases/enrollStudents.ts`

**Change:** Reemplazar `findByPractitionerAndEvent` por `findActiveByPractitionerAndEvent`

```typescript
// ANTES (líneas 36-42)
const existing = await repository.findByPractitionerAndEvent(
  practitioner.id,
  input.eventId,
);

if (existing) {
  skipped.push({ id: practitioner.id, name: practitioner.name });
  continue;
}

// DESPUÉS
const existingActive = await repository.findActiveByPractitionerAndEvent(
  practitioner.id,
  input.eventId,
);

if (existingActive) {
  skipped.push({ id: practitioner.id, name: practitioner.name });
  continue;
}
```

**Behavioral Change:**

- **Antes:** Se omitía al alumno si existía **cualquier** registro (activo o cancelado)
- **Después:** Se omite al alumno solo si existe un registro **activo** (no cancelado)
- **Resultado:** Alumnos con registros cancelados pueden reinscribirse

## 4. Infrastructure Layer Changes

### 4.1 Repository Implementation

**File:** `src/modules/event-registration/infrastructure/repositories/drizzleEventRegistrationRepository.ts`

**Change:** Implementar el nuevo método `findActiveByPractitionerAndEvent`

```typescript
export class DrizzleEventRegistrationRepository implements IEventRegistrationRepository {
  // ... métodos existentes ...

  async findActiveByPractitionerAndEvent(
    practitionerId: string,
    eventId: string,
  ): Promise<EventRegistration | null> {
    const row = await db.query.eventRegistrationsTable.findFirst({
      where: and(
        eq(eventRegistrationsTable.practitionerId, practitionerId),
        eq(eventRegistrationsTable.eventId, eventId),
        ne(eventRegistrationsTable.status, "cancelada"), // Filtro clave: excluir cancelados
      ),
    });

    return row ? this.toEntity(row) : null;
  }

  // ... métodos existentes ...
}
```

**Query Logic:**

- Busca registro donde `practitionerId` = input AND `eventId` = input AND `status` != `"cancelada"`
- Utiliza `ne` (not equal) de Drizzle ORM para excluir registros cancelados
- Retorna el primer registro activo encontrado o `null`

**Database Performance:**

- La query utiliza el mismo índice compuesto que la query existente: `(practitionerId, eventId)`
- No impacto en rendimiento: la condición adicional se evalúa sobre registros ya filtrados por el índice

## 5. Data Flow

### Before (Broken Behavior)

```
Instructor inscribe alumno con registro cancelado
  ↓
enrollStudentsAction valida permisos
  ↓
enrollStudents use case
  ↓
repository.findByPractitionerAndEvent(alumnId, eventId)
  ↓
Query: WHERE practitionerId = X AND eventId = Y
  ↓
Encuentra registro con status="cancelada"
  ↓
existing !== null → Omitir alumno
  ↓
Result: { enrolled: [], skipped: [{ id, name }] }
```

### After (Fixed Behavior)

```
Instructor inscribe alumno con registro cancelado
  ↓
enrollStudentsAction valida permisos
  ↓
enrollStudents use case
  ↓
repository.findActiveByPractitionerAndEvent(alumnId, eventId)
  ↓
Query: WHERE practitionerId = X AND eventId = Y AND status != 'cancelada'
  ↓
No encuentra registro activo (el cancelado es excluido)
  ↓
existingActive === null → Crear nueva inscripción
  ↓
Genera nuevo UUID, determina status inicial, guarda registro
  ↓
Result: { enrolled: ["Alumno Name"], skipped: [] }
```

## 6. Edge Cases

### 6.1 Alumno con múltiples registros cancelados

**Scenario:** Un alumno fue inscrito y eliminado varias veces
**Behavior:** `findActiveByPractitionerAndEvent` retorna `null` (ninguno es activo), permitiendo nueva inscripción
**Outcome:** Se crea un nuevo registro independiente

### 6.2 Alumno con registro cancelado + evento en aforo máximo

**Scenario:** Alumno con registro cancelado, evento lleno
**Behavior:** La verificación de aforo (`hasCapacity`) se ejecuta **antes** del loop de inscripción
**Outcome:** Lanza `EventAtCapacityError` antes de intentar reinscribir al alumno (comportamiento correcto)

### 6.3 Alumno con registro pendiente de pago

**Scenario:** Alumno con `status: "pendiente_pago"`, instructor intenta reinscribir
**Behavior:** `findActiveByPractitionerAndEvent` retorna el registro existente (`status !== "cancelada"`)
**Outcome:** Alumno es omitido (comportamiento correcto, no duplicar inscripciones activas)

### 6.4 Alumno sin registro previo

**Scenario:** Alumno nuevo en el evento
**Behavior:** `findActiveByPractitionerAndEvent` retorna `null`
**Outcome:** Se crea registro normalmente (sin cambios en comportamiento)

## 7. Testing Strategy

### 7.1 Unit Test: enrollStudents Use Case

```typescript
describe("enrollStudents - cancelled registration", () => {
  it("should allow re-enrollment when previous registration is cancelled", async () => {
    const mockRepo = {
      findActiveByPractitionerAndEvent: vi.fn().mockResolvedValue(null), // No registro activo
      countConfirmedByEvent: vi.fn().mockResolvedValue(0),
      save: vi.fn().mockResolvedValue(undefined),
    };

    const result = await enrollStudents(
      {
        instructorId: "instructor-1",
        eventId: "event-1",
        registrationFee: 0,
        maxParticipants: null,
        practitioners: [{ id: "student-1", name: "Juan Pérez" }],
      },
      mockRepo as unknown as IEventRegistrationRepository,
    );

    expect(result.enrolled).toEqual(["Juan Pérez"]);
    expect(result.skipped).toEqual([]);
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
  });
});
```

### 7.2 Integration Test: Repository Implementation

```typescript
describe("DrizzleEventRegistrationRepository.findActiveByPractitionerAndEvent", () => {
  it("should return null when only cancelled registration exists", async () => {
    // Setup: Insert cancelled registration
    await db.insert(eventRegistrationsTable).values({
      id: "reg-1",
      practitionerId: "student-1",
      eventId: "event-1",
      status: "cancelada",
      cancelledAt: new Date().toISOString(),
      // ... otros campos
    });

    const repo = new DrizzleEventRegistrationRepository();
    const result = await repo.findActiveByPractitionerAndEvent(
      "student-1",
      "event-1",
    );

    expect(result).toBeNull();
  });

  it("should return registration when active registration exists", async () => {
    // Setup: Insert active registration
    await db.insert(eventRegistrationsTable).values({
      id: "reg-2",
      practitionerId: "student-2",
      eventId: "event-1",
      status: "confirmada",
      // ... otros campos
    });

    const repo = new DrizzleEventRegistrationRepository();
    const result = await repo.findActiveByPractitionerAndEvent(
      "student-2",
      "event-1",
    );

    expect(result).not.toBeNull();
    expect(result?.status).toBe("confirmada");
  });
});
```

### 7.3 End-to-End Test: enrollStudentsAction

```typescript
describe("enrollStudentsAction - re-enrollment after cancellation", () => {
  it("should allow instructor to re-enroll student after deletion", async () => {
    // Prerequisite: Student was previously enrolled and then deleted
    // Database state: eventRegistrationsTable has cancelled record for student-1

    const result = await enrollStudentsAction({
      eventId: "event-1",
      practitionerIds: ["student-1"],
    });

    expect(result.success).toBe(true);
    expect(result.data?.enrolled).toContain("Student 1 Name");
    expect(result.data?.skipped).toHaveLength(0);
  });
});
```

## 8. Rollback Plan

**If the fix introduces issues:**

1. Revert the three files to their previous state:
   - `eventRegistrationRepository.ts` (remove new method from interface)
   - `enrollStudents.ts` (restore original `findByPractitionerAndEvent` call)
   - `drizzleEventRegistrationRepository.ts` (remove new method implementation)

2. No database migration required (no schema changes)

3. No action or UI changes to revert

**Detection of issues:**

- Monitor enrollment error logs for increased `INTERNAL_ERROR` codes
- Check for duplicate active registrations (should never occur, but would indicate logic error)

## 9. Security Considerations

**Authorization:** No changes to authorization logic. El instructor authorization check permanece en `enrollStudentsAction` antes de llamar al use case.

**Data Integrity:**

- El nuevo método no modifica datos, solo filtra en lectura
- Los registros cancelados históricos se mantienen intactos
- No hay riesgo de borrado accidental de auditoría

**Input Validation:** No changes. Zod validation en `enrollStudentsAction` permanece sin cambios.

## 10. Performance Impact

**Query Performance:**

- Añade una condición `status != 'cancelada'` a la query existente
- Utiliza el mismo índice compuesto `(practitionerId, eventId)`
- Impacto: despreciable (< 1ms adicional en queries)

**Load Impact:**

- No aumenta el número de queries
- No introduce llamadas adicionales a la base de datos
- Comportamiento idempotente: múltiples reinscripciones solo crean un registro activo

## 11. Monitoring & Validation

**Success Metrics:**

- Los alumnos con registros cancelados pueden reinscribirse (observable en UI)
- No aumenta la tasa de errores en `enrollStudentsAction`
- No se crean registros duplicados activos para el mismo alumno en el mismo evento

**Validation Queries:**

```sql
-- Verificar que no existan múltiples registros activos para el mismo par (practitioner, event)
SELECT practitioner_id, event_id, COUNT(*)
FROM event_registrations
WHERE status IN ('confirmada', 'pendiente_pago')
GROUP BY practitioner_id, event_id
HAVING COUNT(*) > 1;
-- Resultado esperado: 0 filas
```

**Logs to Monitor:**

- `[enrollStudentsAction]` logs para errores inesperados
- Aumento en inscripciones exitosas después del fix (KPI positivo)

## 12. Documentation Updates

**Code Comments:**

- Añadir JSDoc al nuevo método `findActiveByPractitionerAndEvent` explicando la semántica
- Documentar en `enrollStudents.ts` por qué se usa el método "Active" en lugar del genérico

**No User-Facing Documentation Required:**

- El cambio corrige un bug, no introduce una nueva feature
- El comportamiento visible para el usuario (reinscripción exitosa) es el esperado originalmente

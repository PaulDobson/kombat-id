# Bugfix Requirements Document

## Introduction

En el sistema de inscripción de eventos, cuando un instructor elimina a un alumno de un evento (marcando el registro como "cancelada"), ese alumno no puede volver a inscribirse en el mismo evento. El sistema muestra el mensaje "Omitidos — ya inscritos" porque detecta que existe un registro previo, sin verificar que dicho registro fue cancelado. Esto impide que alumnos que fueron eliminados por error puedan reinscribirse.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN un instructor elimina a un alumno de un evento (registro con `status: "cancelada"`, `cancelledAt` y `cancelledBy` definidos) AND intenta volver a inscribir al mismo alumno en el mismo evento THEN el sistema muestra el alumno en la lista "Omitidos — ya inscritos" sin crear una nueva inscripción

1.2 WHEN el sistema verifica si un alumno ya está inscrito en un evento THEN busca cualquier registro existente sin filtrar por el estado del registro (`status`)

1.3 WHEN un alumno tiene un registro cancelado previo THEN el sistema trata ese registro como si el alumno estuviera actualmente inscrito

### Expected Behavior (Correct)

2.1 WHEN un instructor intenta inscribir a un alumno que tiene un registro previo con `status: "cancelada"` THEN el sistema SHALL crear una nueva inscripción con estado inicial determinado por el costo del evento (`"confirmada"` para eventos gratuitos, `"pendiente_pago"` para eventos de pago)

2.2 WHEN el sistema verifica si un alumno ya está inscrito en un evento THEN el sistema SHALL buscar únicamente registros con `status` diferente de `"cancelada"` (es decir, registros activos: `"confirmada"` o `"pendiente_pago"`)

2.3 WHEN un alumno con registro cancelado es reinscrito THEN el sistema SHALL crear un nuevo registro independiente con un nuevo UUID, manteniendo intacto el registro histórico cancelado

2.4 WHEN un alumno es reinscrito después de ser eliminado THEN el sistema SHALL mostrar su nombre en la lista de "Inscritos exitosamente"

### Unchanged Behavior (Regression Prevention)

3.1 WHEN un instructor intenta inscribir a un alumno que tiene un registro activo (`status: "confirmada"` o `"pendiente_pago"`) THEN el sistema SHALL CONTINUE TO omitir al alumno y mostrarlo en "Omitidos — ya inscritos"

3.2 WHEN el evento ha alcanzado el aforo máximo (`confirmedCount >= maxParticipants`) THEN el sistema SHALL CONTINUE TO rechazar nuevas inscripciones con el error "El evento ha alcanzado el aforo máximo"

3.3 WHEN un instructor intenta inscribir alumnos que no pertenecen a su academia THEN el sistema SHALL CONTINUE TO rechazar la inscripción con el error "Solo puedes inscribir alumnos de tu academia"

3.4 WHEN se crea una nueva inscripción THEN el sistema SHALL CONTINUE TO determinar el estado inicial según el costo del evento (`registrationFee`)

3.5 WHEN un alumno sin registro previo es inscrito THEN el sistema SHALL CONTINUE TO crear el registro y mostrarlo en "Inscritos exitosamente"

3.6 WHEN se consultan los registros activos para verificar el aforo THEN el sistema SHALL CONTINUE TO contar únicamente registros confirmados (`status: "confirmada"`)

## Root Cause Analysis

**Location:** `src/modules/event-registration/application/use-cases/enrollStudents.ts` líneas 36-42

**Root Cause:** El método `repository.findByPractitionerAndEvent(practitionerId, eventId)` busca cualquier registro sin filtrar por estado. Si encuentra un registro (incluso cancelado), considera al alumno como "ya inscrito" y lo omite.

**Domain Logic Violated:** La regla de negocio implícita es que solo los registros **activos** (`"confirmada"` o `"pendiente_pago"`) deben impedir una nueva inscripción. Los registros cancelados son históricos y no deberían bloquear reinscripciones.

**Impact Scope:**

- Use case: `enrollStudents` (verificación incorrecta)
- Repository interface: `IEventRegistrationRepository` (método `findByPractitionerAndEvent` no especifica si debe filtrar por estado)
- Repository implementation: `DrizzleEventRegistrationRepository` (implementación concreta del método de búsqueda)

## Design Decisions for Fix

### Option 1: Modificar el método de búsqueda existente para filtrar registros cancelados

**Approach:** Cambiar `findByPractitionerAndEvent` para que retorne solo registros con `status !== "cancelada"`

**Pros:**

- Cambio localizado en un solo método
- No requiere cambios en la interfaz del repositorio
- La lógica de filtrado está centralizada

**Cons:**

- Puede romper otros casos de uso que necesiten acceder a registros cancelados para auditoría o historial
- Cambio implícito que puede no ser obvio para futuros desarrolladores

### Option 2: Crear un nuevo método especializado en el repositorio (RECOMENDADO)

**Approach:** Añadir un método `findActiveByPractitionerAndEvent` que filtre explícitamente por registros activos. Mantener el método original sin cambios.

**Pros:**

- Semántica explícita: queda claro que busca registros **activos**
- No rompe casos de uso existentes que puedan necesitar el método original
- Permite acceder a registros cancelados si fuera necesario en el futuro
- Sigue el principio de Open/Closed (extensión sin modificación)

**Cons:**

- Añade un método adicional a la interfaz y la implementación

### Option 3: Añadir un parámetro opcional al método existente

**Approach:** `findByPractitionerAndEvent(practitionerId, eventId, { excludeCancelled?: boolean })`

**Pros:**

- Mantiene un solo método
- Permite flexibilidad con un parámetro opcional

**Cons:**

- Sobrecarga de responsabilidad en un solo método
- Parámetros opcionales pueden hacer el código menos predecible
- Si el parámetro es opcional, el comportamiento por defecto debe decidirse arbitrariamente

### Selected Option

**Option 2: Crear un nuevo método `findActiveByPractitionerAndEvent`**

**Justification:**

- Claridad semántica: el nombre del método comunica explícitamente su propósito
- Preservación del comportamiento existente: no modifica métodos que otros casos de uso puedan estar utilizando
- Adherencia a SOLID: el nuevo método tiene una responsabilidad única y específica
- Extensibilidad: si en el futuro se necesita buscar registros en otros estados específicos, se pueden añadir métodos especializados adicionales

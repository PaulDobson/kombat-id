# public-referee-link Bugfix Design

## Overview

La landing page (`src/app/page.tsx`) omite dos puntos de navegación hacia la página pública `/referees`:

1. La sección "Árbitros Oficiales" muestra únicamente un `<span>` con el contador de árbitros, sin ofrecer un link "Ver todos →" equivalente al que existe en la sección "Próximas actividades".
2. El `<nav>` del footer no incluye un enlace "Árbitros" hacia `/referees`.

La página `/referees` ya existe (`src/app/referees/page.tsx`), es pública y no requiere autenticación. El fix consiste en dos adiciones mínimas y quirúrgicas dentro de `src/app/page.tsx`, sin crear ni modificar ningún otro archivo.

## Glossary

- **Bug_Condition (C)**: La condición que activa el bug — la ausencia de los dos puntos de navegación hacia `/referees` en `src/app/page.tsx`.
- **Property (P)**: El comportamiento correcto esperado — que ambos puntos de navegación existan y funcionen.
- **Preservation**: El comportamiento existente que no debe cambiar — el grid de árbitros, el buscador, el contador, los links del footer actuales, y la sección "Próximas actividades".
- **LandingPage**: El Server Component en `src/app/page.tsx` que renderiza la página pública principal.
- **approvedReferees**: Array de `RefereeListItem[]` obtenido en `LandingPage` mediante `getApprovedReferees()`.
- **`/referees`**: Ruta pública (`src/app/referees/page.tsx`) que muestra el directorio completo de árbitros sin requerir autenticación.

## Bug Details

### Bug Condition

El bug se manifiesta en dos lugares dentro de `src/app/page.tsx`:

1. En la sección "Árbitros Oficiales", el elemento que muestra el contador de árbitros es un `<span>` sin ningún link adyacente hacia `/referees`.
2. En el `<nav>` del footer, no existe ningún `<Link>` apuntando a `/referees`.

**Formal Specification:**

```
FUNCTION isBugCondition(file)
  INPUT: file = contenido de src/app/page.tsx
  OUTPUT: boolean

  RETURN (
    NOT contiene(file, '<Link href="/referees"') EN sección "Árbitros Oficiales"
    OR
    NOT contiene(file, '<Link href="/referees"') EN footer <nav>
  )
END FUNCTION
```

### Examples

- **Sección árbitros — actual**: `<span className="text-sm text-neutral-500 shrink-0">{approvedReferees.length} árbitros</span>` — sin link.
- **Sección árbitros — esperado**: Un `<div>` con el contador y un `<Link href="/referees">Ver todos →</Link>` con clase `text-xs text-primary-400 hover:text-primary-300 transition-colors shrink-0`.
- **Footer — actual**: Links a `/academies`, `/verify`, `/login`, `/register` — sin `/referees`.
- **Footer — esperado**: Los mismos links más `<Link href="/referees">Árbitros</Link>` con clase `hover:text-neutral-400 transition-colors`.
- **Edge case**: Si `approvedReferees.length === 0`, el link "Ver todos →" debe seguir renderizándose (la sección árbitros no tiene renderizado condicional, a diferencia de la sección de eventos).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- El grid de árbitros (`<RefereeGrid>`) debe continuar renderizándose con los mismos datos y props.
- El buscador (`<form method="GET">`) debe continuar funcionando sin cambios.
- El contador de árbitros debe continuar mostrándose junto al nuevo link.
- Los links existentes del footer (`/academies`, `/verify`, `/login`, `/register`) deben continuar navegando a sus rutas sin cambios.
- La sección "Próximas actividades" y su link "Ver todos →" existente deben permanecer intactos.
- La página `/referees` debe continuar siendo accesible directamente sin autenticación.

**Scope:**
Todos los inputs que NO involucren los dos puntos de navegación ausentes deben quedar completamente sin cambios. Esto incluye:

- Cualquier interacción con el buscador de árbitros.
- Clics en los links del footer existentes.
- Navegación a cualquier otra sección de la landing page.
- Renderizado del hero, stats, features, verificación y CTA final.

## Hypothesized Root Cause

El bug es de omisión, no de lógica defectuosa. Las causas son:

1. **Link de sección no añadido**: Al implementar la sección "Árbitros Oficiales" en la landing page, se copió el patrón del contador de la sección de eventos pero no se añadió el link "Ver todos →" que sí tiene esa sección. El `<span>` del contador no fue reemplazado por un `<div>` contenedor con link.

2. **Footer no actualizado**: Al crear la página pública `/referees`, no se actualizó el footer de la landing page para incluir el nuevo enlace. El footer solo refleja las rutas que existían antes de que `/referees` fuera creada.

No hay lógica incorrecta que corregir — solo dos adiciones de markup JSX en el archivo correcto.

## Correctness Properties

Property 1: Bug Condition — Navegación hacia /referees presente en landing page

_For any_ renderizado de `LandingPage`, el componente fijo SHALL incluir un `<Link href="/referees">` con texto "Ver todos →" en la sección "Árbitros Oficiales" Y un `<Link href="/referees">` con texto "Árbitros" en el footer `<nav>`.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation — Comportamiento existente sin cambios

_For any_ renderizado de `LandingPage` donde el usuario interactúa con elementos distintos a los dos nuevos links (buscador, footer existente, grid de árbitros, sección de eventos), el componente fijo SHALL producir exactamente el mismo resultado que el componente original, preservando toda la funcionalidad preexistente.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `src/app/page.tsx`

**Cambio 1 — Sección "Árbitros Oficiales": reemplazar `<span>` del contador por `<div>` con contador y link**

Localizar el elemento actual:

```tsx
<span className="text-sm text-neutral-500 shrink-0">
  {approvedReferees.length}{" "}
  {approvedReferees.length === 1 ? "árbitro" : "árbitros"}
</span>
```

Reemplazar por:

```tsx
<div className="flex items-center gap-3 shrink-0">
  <span className="text-sm text-neutral-500">
    {approvedReferees.length}{" "}
    {approvedReferees.length === 1 ? "árbitro" : "árbitros"}
  </span>
  <Link
    href="/referees"
    className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
  >
    Ver todos →
  </Link>
</div>
```

**Cambio 2 — Footer `<nav>`: añadir link a `/referees`**

Localizar el `<nav>` del footer y añadir el nuevo `<Link>` antes del link de `/academies` (o en la posición que mantenga coherencia semántica con el orden de secciones de la página):

```tsx
<Link href="/referees" className="hover:text-neutral-400 transition-colors">
  Árbitros
</Link>
```

**Notas de implementación:**

- `Link` de `next/link` ya está importado en el archivo — no se requiere ningún import adicional.
- No se crea ningún archivo nuevo.
- No se modifica ningún otro archivo.
- El componente `LandingPage` es un Server Component — no se añade `"use client"` ni ningún hook.
- El fix es compatible con las reglas SOLID y Clean Architecture del proyecto: es una adición de markup de navegación en la capa de presentación, sin lógica de negocio.

## Testing Strategy

### Validation Approach

La estrategia sigue dos fases: primero confirmar el bug en el código sin corregir (exploratory), luego verificar que el fix introduce los links correctos y no rompe nada existente (fix checking + preservation checking).

### Exploratory Bug Condition Checking

**Goal**: Confirmar que los dos links ausentes no existen en el código actual antes de aplicar el fix.

**Test Plan**: Inspeccionar el AST/contenido de `src/app/page.tsx` para verificar la ausencia de `<Link href="/referees">` en la sección de árbitros y en el footer. Ejecutar en código sin corregir para observar el fallo.

**Test Cases**:

1. **Link en sección árbitros ausente**: Verificar que no existe ningún `<Link href="/referees">` dentro del bloque JSX de la sección "Árbitros Oficiales" (fallará en código sin corregir).
2. **Link en footer ausente**: Verificar que el `<nav>` del footer no contiene ningún `<Link href="/referees">` (fallará en código sin corregir).
3. **Navegación a /referees desde landing**: Renderizar la landing page y verificar que no hay ningún elemento `<a href="/referees">` en el output HTML (fallará en código sin corregir).

**Expected Counterexamples**:

- El output HTML de la landing page no contiene `href="/referees"` en ningún punto.
- El `<span>` del contador de árbitros no tiene ningún link adyacente.

### Fix Checking

**Goal**: Verificar que para todos los renderizados de `LandingPage` donde se aplica la condición del bug, el componente corregido produce los links esperados.

**Pseudocode:**

```
FOR ALL render WHERE isBugCondition(page.tsx_original) DO
  result := render(LandingPage_fixed)
  ASSERT contiene(result, '<a href="/referees">Ver todos →</a>') EN sección árbitros
  ASSERT contiene(result, '<a href="/referees">Árbitros</a>') EN footer nav
END FOR
```

### Preservation Checking

**Goal**: Verificar que para todos los inputs donde la condición del bug NO aplica (interacciones con elementos preexistentes), el componente corregido produce el mismo resultado que el original.

**Pseudocode:**

```
FOR ALL element WHERE NOT isBugCondition(element) DO
  ASSERT render(LandingPage_original, element) = render(LandingPage_fixed, element)
END FOR
```

**Testing Approach**: Las pruebas de preservación son especialmente importantes aquí porque el fix modifica el JSX de un componente con muchos elementos. Se recomienda snapshot testing del output HTML completo para detectar regresiones involuntarias.

**Test Cases**:

1. **Preservación del contador**: Verificar que el número de árbitros sigue apareciendo junto al nuevo link.
2. **Preservación del footer existente**: Verificar que los links `/academies`, `/verify`, `/login`, `/register` siguen presentes con sus clases y textos originales.
3. **Preservación del link "Ver todos →" de eventos**: Verificar que el link de la sección "Próximas actividades" no fue alterado.
4. **Preservación del grid de árbitros**: Verificar que `<RefereeGrid>` recibe los mismos props que antes.

### Unit Tests

- Renderizar `LandingPage` con datos mock y verificar que existe exactamente un `<a href="/referees">` en la sección árbitros con texto "Ver todos →".
- Renderizar `LandingPage` y verificar que el footer `<nav>` contiene un `<a href="/referees">` con texto "Árbitros".
- Verificar que el contador de árbitros sigue visible cuando `approvedReferees.length > 0`.
- Verificar que el link "Ver todos →" de árbitros se renderiza incluso cuando `approvedReferees.length === 0`.

### Property-Based Tests

- Generar arrays de árbitros de longitud aleatoria (0–200) y verificar que el link "Ver todos →" siempre aparece en la sección árbitros independientemente del conteo.
- Generar arrays de árbitros de longitud aleatoria y verificar que el contador muestra el valor correcto junto al link.
- Verificar que el número de `<a href="/referees">` en el output HTML es exactamente 2 (sección árbitros + footer) para cualquier estado de datos.

### Integration Tests

- Navegar a la landing page en un entorno de prueba y verificar que el link "Ver todos →" de la sección árbitros lleva a `/referees` sin requerir autenticación.
- Navegar a la landing page y verificar que el link "Árbitros" del footer lleva a `/referees` sin requerir autenticación.
- Verificar que los links del footer preexistentes siguen funcionando correctamente después del fix.
- Verificar que la página `/referees` carga correctamente al navegar desde ambos puntos de entrada nuevos.

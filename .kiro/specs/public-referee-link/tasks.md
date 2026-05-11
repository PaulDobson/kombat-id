# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Navegación hacia /referees ausente en landing page
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: El bug es determinista — scope the property to the two concrete failing cases: (a) ausencia de `<Link href="/referees">` en la sección "Árbitros Oficiales" y (b) ausencia de `<Link href="/referees">` en el footer `<nav>`
  - Render `LandingPage` con arrays de árbitros de longitud arbitraria (incluyendo longitud 0) usando datos mock
  - Para cada render, verificar que el output HTML contiene exactamente 2 elementos `<a href="/referees">`: uno con texto "Ver todos →" en la sección árbitros y otro con texto "Árbitros" en el footer
  - Bug Condition (isBugCondition): el archivo `src/app/page.tsx` NO contiene `<Link href="/referees">` en la sección "Árbitros Oficiales" NI en el footer `<nav>`
  - Expected Behavior: el output HTML contiene `href="/referees"` con texto "Ver todos →" en la sección árbitros Y `href="/referees"` con texto "Árbitros" en el footer
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "El output HTML de LandingPage no contiene ningún href='/referees'")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Comportamiento existente sin cambios
  - **IMPORTANT**: Follow observation-first methodology
  - Observe en código sin corregir: el footer `<nav>` contiene exactamente los links `/academies`, `/verify`, `/login`, `/register` con sus textos y clases originales
  - Observe en código sin corregir: la sección "Árbitros Oficiales" renderiza `<RefereeGrid>` con los mismos props (referees, searchQuery) para cualquier array de árbitros
  - Observe en código sin corregir: el contador de árbitros muestra el valor correcto (`{n} árbitro` / `{n} árbitros`) para cualquier `n`
  - Observe en código sin corregir: la sección "Próximas actividades" y su link "Ver todos →" hacia `/login` permanecen intactos cuando `upcoming.length > 0`
  - Write property-based tests: para todo array de árbitros de longitud aleatoria (0–200), el footer contiene exactamente los 4 links preexistentes con sus hrefs y textos originales (Preservation Requirements del diseño)
  - Write property-based tests: para todo array de árbitros de longitud `n`, el contador muestra `n árbitro` si `n === 1` o `n árbitros` si `n !== 1`
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix: añadir links de navegación hacia /referees en src/app/page.tsx
  - [x] 3.1 Implementar Cambio 1 — reemplazar `<span>` del contador por `<div>` con contador y link en la sección "Árbitros Oficiales"
    - Localizar el `<span className="text-sm text-neutral-500 shrink-0">` que muestra `{approvedReferees.length}` en la sección "Árbitros Oficiales"
    - Reemplazar el `<span>` por un `<div className="flex items-center gap-3 shrink-0">` que contenga el `<span>` del contador (sin `shrink-0`) y un `<Link href="/referees" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">Ver todos →</Link>`
    - `Link` de `next/link` ya está importado — no se requiere ningún import adicional
    - El componente `LandingPage` es un Server Component — no añadir `"use client"` ni hooks
    - _Bug_Condition: isBugCondition(page.tsx) donde NOT contiene `<Link href="/referees">` en sección "Árbitros Oficiales"_
    - _Expected_Behavior: el output HTML contiene `<a href="/referees">Ver todos →</a>` en la sección árbitros para cualquier valor de `approvedReferees.length`, incluyendo 0_
    - _Preservation: el contador `{approvedReferees.length} árbitro/árbitros` sigue visible junto al nuevo link; `<RefereeGrid>` recibe los mismos props_
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 3.2 Implementar Cambio 2 — añadir link "Árbitros" en el footer `<nav>`
    - Localizar el `<nav className="flex items-center gap-6" aria-label="Footer">` en el footer
    - Añadir `<Link href="/referees" className="hover:text-neutral-400 transition-colors">Árbitros</Link>` antes del link de `/academies` para mantener coherencia semántica con el orden de secciones de la página
    - No modificar ningún otro link del footer ni sus clases
    - _Bug_Condition: isBugCondition(page.tsx) donde NOT contiene `<Link href="/referees">` en footer `<nav>`_
    - _Expected_Behavior: el footer `<nav>` contiene `<a href="/referees">Árbitros</a>` para cualquier renderizado de LandingPage_
    - _Preservation: los links existentes `/academies`, `/verify`, `/login`, `/register` permanecen con sus textos, hrefs y clases sin cambios_
    - _Requirements: 2.3, 3.3_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Navegación hacia /referees presente en landing page
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms both `<Link href="/referees">` elements are present in the rendered output
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Comportamiento existente sin cambios
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm footer links preexistentes, contador de árbitros, RefereeGrid y sección de eventos permanecen intactos

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

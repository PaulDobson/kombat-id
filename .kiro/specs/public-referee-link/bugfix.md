# Bugfix Requirements Document

## Introduction

En la landing page (`src/app/page.tsx`), la sección "Árbitros Oficiales" no tiene un link "Ver todos →" que apunte a la página pública `/referees`. Esta página ya existe, es pública y no requiere autenticación. La ausencia del link impide que los visitantes de la landing page naveguen directamente al directorio completo de árbitros. Adicionalmente, el footer no incluye un enlace a `/referees`, lo que reduce la visibilidad de esa sección pública.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN un usuario visita la landing page y ve la sección "Árbitros Oficiales" THEN el sistema no muestra ningún link "Ver todos →" hacia `/referees`, solo muestra el contador de árbitros

1.2 WHEN un usuario revisa el footer de la landing page THEN el sistema no incluye ningún enlace a la sección pública `/referees`

### Expected Behavior (Correct)

2.1 WHEN un usuario visita la landing page y ve la sección "Árbitros Oficiales" THEN el sistema SHALL mostrar un link "Ver todos →" que apunte a `/referees`, siguiendo el mismo patrón visual que el link "Ver todos →" de la sección "Próximas actividades"

2.2 WHEN un usuario hace clic en el link "Ver todos →" de la sección "Árbitros Oficiales" THEN el sistema SHALL navegar a `/referees` sin requerir autenticación

2.3 WHEN un usuario revisa el footer de la landing page THEN el sistema SHALL incluir un enlace "Árbitros" que apunte a `/referees`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN un usuario visita la sección "Árbitros Oficiales" en la landing page THEN el sistema SHALL CONTINUE TO mostrar el grid de árbitros aprobados con el buscador y el contador

3.2 WHEN un usuario visita la página `/referees` directamente THEN el sistema SHALL CONTINUE TO mostrar el directorio completo de árbitros sin requerir autenticación

3.3 WHEN un usuario hace clic en los links existentes del footer (Academias, Verificar, Iniciar sesión, Registrarse) THEN el sistema SHALL CONTINUE TO navegar a sus rutas correspondientes sin cambios

3.4 WHEN un usuario visita la sección "Próximas actividades" THEN el sistema SHALL CONTINUE TO mostrar los eventos próximos con su estructura actual

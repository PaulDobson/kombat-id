# UI Design System — Kombat Taekwondo Identity

## Stack de UI

- **Tailwind CSS v4** — utility-first, configurado via CSS (`@theme` en `globals.css`)
- **Radix UI** — componentes primitivos accesibles (sin estilos propios)
- **tailwind-merge** — para combinar clases sin conflictos (`cn()` helper)
- **next-themes** — gestión de tema dark/light
- **tailwindcss-animate** — animaciones declarativas

## Principio fundamental

**Usar componentes nativos de Radix UI directamente.** No crear wrappers propios ni componentes de UI custom. Aplicar estilos Tailwind directamente sobre los primitivos de Radix.

```tsx
// ✅ CORRECTO — Radix nativo con clases Tailwind
import * as Dialog from "@radix-ui/react-dialog";

<Dialog.Root>
  <Dialog.Trigger className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
    Abrir
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-neutral-900 rounded-xl p-6 w-full max-w-md">
      ...
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

// ❌ INCORRECTO — no crear wrappers
export function MyDialog({ ... }) { ... }
```

## Tema: Dark First

El tema base es oscuro. El modo claro es opcional vía `next-themes`.

### Paleta de colores (definida en `globals.css` con `@theme`)

```
Fondo principal:    #0a0a0a  (neutral-950)
Fondo elevado:      #171717  (neutral-900)
Fondo overlay:      #262626  (neutral-800)
Borde:              #404040  (neutral-700)
Texto principal:    #fafafa  (neutral-50)
Texto secundario:   #a3a3a3  (neutral-400)
Texto terciario:    #737373  (neutral-500)

Acento primario:    #6366F1  (indigo-500)
Acento hover:       #4F46E5  (indigo-600)
Acento activo:      #4338CA  (indigo-700)

Éxito:              #10B981  (emerald-500)
Advertencia:        #F59E0B  (amber-500)
Error:              #F43F5E  (rose-500)
Info:               #3B82F6  (blue-500)
```

### Variables CSS

Definidas en `globals.css` bajo `:root` y `[data-theme="dark"]`:

```css
--background: 0 0% 4%; /* neutral-950 */
--background-elevated: 0 0% 9%; /* neutral-900 */
--background-overlay: 0 0% 15%; /* neutral-800 */
--foreground: 0 0% 98%; /* neutral-50 */
--foreground-secondary: 0 0% 64%; /* neutral-400 */
--border: 0 0% 25%; /* neutral-700 */
--border-hover: 0 0% 40%; /* neutral-600 */
--border-focus: 239 84% 67%; /* indigo-500 */
```

## Patrones de uso por componente Radix

### Dialog / Modal

```tsx
import * as Dialog from "@radix-ui/react-dialog";

// Overlay: bg-black/60 backdrop-blur-sm
// Content: bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl
// Title: text-lg font-semibold text-neutral-50
// Description: text-sm text-neutral-400
```

### Select

```tsx
import * as Select from "@radix-ui/react-select";

// Trigger: flex items-center justify-between px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm
// Content: bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl
// Item: px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 cursor-pointer
// ItemIndicator: text-primary-500
```

### Tabs

```tsx
import * as Tabs from "@radix-ui/react-tabs";

// List: flex border-b border-neutral-700
// Trigger: px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 data-[state=active]:text-primary-400 data-[state=active]:border-b-2 data-[state=active]:border-primary-500
// Content: pt-4
```

### Checkbox

```tsx
import * as Checkbox from "@radix-ui/react-checkbox";

// Root: w-4 h-4 bg-neutral-800 border border-neutral-600 rounded data-[state=checked]:bg-primary-600 data-[state=checked]:border-primary-600
// Indicator: text-white
```

### Switch

```tsx
import * as Switch from "@radix-ui/react-switch";

// Root: w-10 h-6 bg-neutral-700 rounded-full data-[state=checked]:bg-primary-600 transition-colors
// Thumb: block w-4 h-4 bg-white rounded-full shadow translate-x-1 data-[state=checked]:translate-x-5 transition-transform
```

### Tooltip

```tsx
import * as Tooltip from "@radix-ui/react-tooltip";

// Content: px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-200 shadow-lg
// Arrow: fill-neutral-800
```

### Avatar

```tsx
import * as Avatar from "@radix-ui/react-avatar";

// Root: w-8 h-8 rounded-full overflow-hidden
// Image: w-full h-full object-cover
// Fallback: w-full h-full bg-primary-700 flex items-center justify-center text-xs font-medium text-white
```

### Separator

```tsx
import * as Separator from "@radix-ui/react-separator";

// Root: bg-neutral-700 data-[orientation=horizontal]:h-px data-[orientation=vertical]:w-px
```

## Tipografía

- **Font**: Inter (variable `--font-inter`)
- **Escala**: Tailwind estándar (text-xs → text-6xl)
- **Headings**: `font-semibold` o `font-bold`, `tracking-tight`
- **Body**: `text-sm` o `text-base`, `text-neutral-200`
- **Labels**: `text-xs font-medium text-neutral-400 uppercase tracking-wider`

## Espaciado y layout

- **Contenedor máximo**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Cards**: `bg-neutral-900 border border-neutral-700 rounded-xl p-6`
- **Secciones**: `space-y-6` entre bloques
- **Formularios**: `space-y-4` entre campos, labels arriba del input

## Formularios (inputs nativos + Radix Label)

```tsx
import * as Label from "@radix-ui/react-label";

// Label: block text-sm font-medium text-neutral-300 mb-1
// Input: w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-100
//        placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
// Error: text-xs text-error-400 mt-1
```

## Botones (elementos nativos `<button>`)

No usar componentes de botón custom. Aplicar clases directamente:

```
Primario:    bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors
Secundario:  bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-4 py-2 rounded-lg text-sm font-medium
Destructivo: bg-error-600 hover:bg-error-700 text-white px-4 py-2 rounded-lg text-sm font-medium
Ghost:       hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 px-4 py-2 rounded-lg text-sm
Disabled:    opacity-50 cursor-not-allowed
```

## Estados de datos

```
Cargando:   animate-pulse bg-neutral-800 rounded (skeleton)
Vacío:      text-neutral-500 text-sm text-center py-8
Error:      text-error-400 text-sm
Éxito:      text-success-400 text-sm
Badge activo:   bg-success-900/50 text-success-400 border border-success-800 px-2 py-0.5 rounded-full text-xs
Badge inactivo: bg-neutral-800 text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full text-xs
```

## Helper `cn()`

Siempre usar `tailwind-merge` para combinar clases:

```typescript
// src/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Reglas de accesibilidad

- Siempre incluir `aria-label` en botones icon-only
- Usar `role="alert"` para mensajes de error
- Mantener contraste mínimo WCAG AA (texto sobre fondo)
- Los componentes Radix ya manejan focus, keyboard navigation y ARIA roles — no sobreescribir sin razón

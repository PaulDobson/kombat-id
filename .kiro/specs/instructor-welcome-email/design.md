# Design Document — instructor-welcome-email

## Overview

El feature realiza cambios quirúrgicos en dos archivos existentes:

1. **`src/lib/email.ts`** — `sendInstructorApprovalEmail` recibe un cuarto parámetro opcional (`passwordResetLink`) y reemplaza el contenido del correo para incluir un botón CTA que apunta directamente al flujo de cambio de contraseña.
2. **`src/modules/instructor-account-requests/presentation/actions/instructorAccountRequestActions.ts`** — `approveInstructorAccountRequestAction` genera un Password Reset Link vía `adminSupabase.auth.admin.generateLink` y lo pasa a `sendInstructorApprovalEmail`.

No se crean módulos nuevos ni se modifica ningún otro archivo.

---

## Architecture

El diseño sigue la arquitectura existente del proyecto: la action es la composition root que orquesta servicios externos (Supabase Admin API, Email Service). El Email Service permanece como una función pura de renderizado y envío.

```
approveInstructorAccountRequestAction (actions.ts)
  │
  ├─► approveInstructorAccountRequest (use case)          [sin cambios]
  ├─► adminSupabase.from("practitioners").insert(...)     [sin cambios]
  ├─► adminSupabase.auth.admin.generateLink(...)          [NUEVO — genera reset link]
  └─► sendInstructorApprovalEmail(email, name, pwd, link) [MODIFICADO — 4.º parámetro]
        └─► resend.emails.send(...)                       [sin cambios]
```

El link de reset se genera **después** de que la aprobación y la creación del practitioner han completado, preservando el orden de operaciones actual (Requirement 4.3).

---

## Components

### 1. `sendInstructorApprovalEmail` (modificación en `src/lib/email.ts`)

**Responsabilidad única:** Componer y enviar el correo de bienvenida del instructor.

#### Firma actualizada

```typescript
export async function sendInstructorApprovalEmail(
  to: string,
  fullName: string,
  temporaryPassword: string,
  passwordResetLink?: string | null,
): Promise<void>;
```

El cuarto parámetro es opcional para mantener compatibilidad de tipo (aunque en la práctica siempre se pasará desde la action). El tipo de retorno `Promise<void>` no cambia.

#### Lógica del href del botón CTA

```typescript
const ctaHref =
  passwordResetLink && passwordResetLink.trim() !== ""
    ? passwordResetLink
    : `${SITE_URL}/login`;
```

Esta expresión es la única lógica de negocio nueva en `email.ts`. Se evalúa una sola vez al inicio del cuerpo de la función.

#### Cambios en el contenido HTML

| Elemento           | Antes                                                                | Después                                                               |
| ------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Subject            | `"Tu cuenta de instructor fue aprobada — Kombat Taekwondo"`          | `"Bienvenido a Kombat ID — Configura tu contraseña"`                  |
| Botón CTA          | href = `${SITE_URL}/login`, texto = `"Iniciar sesión"`               | href = `ctaHref`, texto = `"Cambiar mi contraseña"`                   |
| Instrucción        | "Por seguridad, cambia tu contraseña inmediatamente desde el perfil" | "Usa el botón para cambiar tu contraseña. El link es de un solo uso." |
| Enlace texto plano | `${SITE_URL}/login`                                                  | `ctaHref`                                                             |

El bloque de credenciales (fondo `#0e0e0e`, borde `#3a2e10`), el template `wrap()`, el saludo con `fullName` en color `#F0E6C8`, y el botón con fondo `#C9A84C` / texto `#111111` se mantienen idénticos al diseño de `sendStudentWelcomeEmail`.

---

### 2. `approveInstructorAccountRequestAction` (modificación en `instructorAccountRequestActions.ts`)

**Cambios únicamente en el bloque después de la inserción en `practitioners`.**

#### Secuencia de operaciones (orden preservado)

```typescript
// 1. Aprobación del request y creación de Auth user [sin cambios]
const { temporaryPassword } = await approveInstructorAccountRequest(...);

// 2. Inserción del practitioner [sin cambios]
await adminSupabase.from("practitioners").insert({...});

// 3. NUEVO — generar el Password Reset Link (fire-and-forget implícito via null fallback)
let passwordResetLink: string | null = null;
if (request) {
  const { data: linkData, error: linkError } =
    await adminSupabase.auth.admin.generateLink({
      type: "recovery",
      email: request.email,
    });

  if (!linkError && linkData?.properties?.action_link) {
    passwordResetLink = linkData.properties.action_link;
  } else if (linkError) {
    console.error(
      "[approveInstructorAccountRequestAction] generateLink error:",
      linkError,
    );
    // No se interrumpe el flujo — passwordResetLink permanece null
  }
}

// 4. MODIFICADO — envío de email con link (fire-and-forget, sin cambios en el patrón)
if (request) {
  sendInstructorApprovalEmail(
    request.email,
    request.fullName,
    temporaryPassword,
    passwordResetLink,
  ).catch((err) =>
    console.error("[approveInstructorAccountRequestAction] Email error:", err),
  );
}

// 5. Retorno [sin cambios]
return { success: true, data: { temporaryPassword } };
```

**Puntos clave:**

- `generateLink` se llama sincrónicamente (con `await`) antes del envío de email, pero **dentro del bloque try existente**, por lo que cualquier error inesperado de `generateLink` que no sea capturado por la condición `linkError` sería atrapado por el `catch` externo de la action.
- El `passwordResetLink` **nunca** se agrega al `data` retornado al cliente (Requirement 4.1).
- El patrón fire-and-forget con `.catch()` en el envío de email no cambia.

---

## Data Models

No se introducen nuevos tipos de datos. Los únicos cambios de interfaz son:

```typescript
// Antes
sendInstructorApprovalEmail(to, fullName, temporaryPassword)

// Después
sendInstructorApprovalEmail(to, fullName, temporaryPassword, passwordResetLink?)
```

El tipo `passwordResetLink` es `string | null | undefined`. La función acepta las tres variantes y aplica el fallback de forma defensiva.

---

## Error Handling

| Escenario                                                  | Comportamiento                                                                                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateLink` retorna `error` no nulo                     | Se registra el error con `console.error`, `passwordResetLink` queda `null`, el correo se envía con fallback a `${SITE_URL}/login`                                       |
| `generateLink` retorna `data` sin `properties.action_link` | `passwordResetLink` queda `null`, mismo fallback                                                                                                                        |
| `generateLink` lanza excepción inesperada                  | Capturada por el `catch` externo de la action; retorna `{ success: false, error: "Error interno", code: "INTERNAL_ERROR" }` — es un escenario extremadamente improbable |
| `sendInstructorApprovalEmail` lanza excepción              | Capturada por `.catch()`, registrada en consola, no bloquea la respuesta al cliente                                                                                     |
| `passwordResetLink` es cadena vacía                        | `ctaHref` usa fallback `${SITE_URL}/login`                                                                                                                              |

---

## Correctness Properties

_Una propiedad es una característica o comportamiento que debe sostenerse en todas las ejecuciones válidas del sistema — esencialmente, un enunciado formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre las especificaciones legibles por humanos y las garantías de corrección verificables automáticamente._

### Property 1: El correo incluye los datos del instructor en el HTML generado

_Para cualquier_ combinación válida de `to` (correo electrónico), `fullName` (nombre) y `temporaryPassword` (contraseña temporal), el HTML generado por `sendInstructorApprovalEmail` debe contener el nombre del instructor con el color de saludo `#F0E6C8`, el correo electrónico y la contraseña temporal dentro del bloque de credenciales, y la estructura base del template `wrap()`.

**Validates: Requirements 3.1, 3.2, 3.3**

---

### Property 2: El link de reset válido aparece en el botón CTA y en el texto plano

_Para cualquier_ valor de `passwordResetLink` que sea un string no vacío, el HTML generado por `sendInstructorApprovalEmail` debe contener ese valor como `href` del botón de llamada a la acción con fondo `#C9A84C` **y** también como URL visible en el enlace de texto plano destinado a clientes de correo sin soporte HTML.

**Validates: Requirements 2.2, 3.4, 3.6**

---

### Property 3: Los valores falsy del link usan el fallback definido

_Para cualquier_ valor de `passwordResetLink` que sea `null`, `undefined` o la cadena vacía `""`, el HTML generado por `sendInstructorApprovalEmail` debe contener `${SITE_URL}/login` como `href` del botón CTA y como URL en el texto plano, sin exponer el valor falsy original en ninguna parte del HTML.

**Validates: Requirements 2.3, 3.4, 3.6**

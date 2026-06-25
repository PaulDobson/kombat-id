# Plan de implementación: instructor-welcome-email

## Descripción general

Dos cambios quirúrgicos en archivos existentes:

1. **`src/lib/email.ts`** — Actualizar `sendInstructorApprovalEmail` para aceptar un cuarto parámetro `passwordResetLink` y reemplazar el contenido HTML del correo.
2. **`src/modules/instructor-account-requests/presentation/actions/instructorAccountRequestActions.ts`** — Actualizar `approveInstructorAccountRequestAction` para generar el Password Reset Link y pasarlo a la función de email.

## Tareas

- [x] 1. Actualizar `sendInstructorApprovalEmail` en `src/lib/email.ts`
  - [x] 1.1 Agregar el cuarto parámetro `passwordResetLink?: string | null` a la firma de `sendInstructorApprovalEmail`
    - Insertar el parámetro después de `temporaryPassword: string`
    - El tipo es `string | null | undefined` para aceptar las tres variantes
    - La firma de retorno `Promise<void>` no cambia
    - _Requisitos: 2.1, 2.4, 4.4_

  - [x] 1.2 Calcular `ctaHref` al inicio del cuerpo de la función
    - Añadir la expresión: `const ctaHref = passwordResetLink && passwordResetLink.trim() !== "" ? passwordResetLink : \`\${SITE_URL}/login\`;`
    - Esta es la única lógica de negocio nueva en `email.ts`
    - _Requisitos: 2.2, 2.3_

  - [x] 1.3 Reemplazar el contenido HTML del correo
    - Cambiar el subject a `"Bienvenido a Kombat ID — Configura tu contraseña"`
    - Reemplazar el párrafo de instrucción de seguridad por: "Usa el botón para cambiar tu contraseña. El link es de un solo uso."
    - Cambiar el `href` del botón CTA de `${SITE_URL}/login` a `ctaHref`
    - Cambiar el texto del botón CTA de `"Iniciar sesión"` a `"Cambiar mi contraseña"`
    - Cambiar el enlace de texto plano de `${SITE_URL}/login` a `ctaHref`
    - Mantener sin cambios: template `wrap()`, saludo con `fullName` en `#F0E6C8`, bloque de credenciales (fondo `#0e0e0e`, borde `#3a2e10`), botón con fondo `#C9A84C` / texto `#111111`
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x]\* 1.4 Escribir test de propiedad — datos del instructor presentes en el HTML
    - **Propiedad 1: El correo incluye los datos del instructor en el HTML generado**
    - Para cualquier combinación válida de `to`, `fullName` y `temporaryPassword`, el HTML debe contener el nombre del instructor con `#F0E6C8`, el correo y la contraseña en el bloque de credenciales, y la estructura `wrap()`
    - **Valida: Requisitos 3.1, 3.2, 3.3**

  - [x]\* 1.5 Escribir test de propiedad — link válido aparece en CTA y texto plano
    - **Propiedad 2: El link de reset válido aparece en el botón CTA y en el texto plano**
    - Para cualquier `passwordResetLink` string no vacío, el HTML debe contener ese valor como `href` del botón `#C9A84C` y también en el enlace de texto plano
    - **Valida: Requisitos 2.2, 3.4, 3.6**

  - [x]\* 1.6 Escribir test de propiedad — valores falsy usan el fallback
    - **Propiedad 3: Los valores falsy del link usan el fallback definido**
    - Para `passwordResetLink` igual a `null`, `undefined` o `""`, el HTML debe contener `${SITE_URL}/login` en el botón CTA y en el texto plano, sin exponer el valor falsy
    - **Valida: Requisitos 2.3, 3.4, 3.6**

- [x] 2. Checkpoint — verificar `email.ts`
  - Confirmar que el build de TypeScript no arroja errores tras los cambios en `email.ts`
  - Asegúrate de que `sendInstructorRejectionEmail` permanece sin modificaciones
  - Asegúrate de que `sendStudentWelcomeEmail` permanece sin modificaciones
  - Asegúrate de que `sendRefereeApprovalEmail` permanece sin modificaciones
  - Pregunta al usuario si hay dudas antes de continuar.

- [x] 3. Actualizar `approveInstructorAccountRequestAction` en `instructorAccountRequestActions.ts`
  - [x] 3.1 Generar el Password Reset Link después de la inserción en `practitioners`
    - Declarar `let passwordResetLink: string | null = null;` antes del bloque condicional
    - Dentro del bloque `if (request?.authUserId)` (después de la inserción en `practitioners`), agregar un segundo `if (request)` para llamar `adminSupabase.auth.admin.generateLink({ type: "recovery", email: request.email })`
    - Si `!linkError && linkData?.properties?.action_link`, asignar `passwordResetLink = linkData.properties.action_link`
    - Si `linkError`, registrar con `console.error("[approveInstructorAccountRequestAction] generateLink error:", linkError)` y dejar `passwordResetLink` en `null`
    - _Requisitos: 1.1, 1.2, 1.3, 4.3_

  - [x] 3.2 Pasar `passwordResetLink` al llamado de `sendInstructorApprovalEmail`
    - En el bloque `if (request)` que llama a `sendInstructorApprovalEmail`, agregar `passwordResetLink` como cuarto argumento
    - La llamada queda: `sendInstructorApprovalEmail(request.email, request.fullName, temporaryPassword, passwordResetLink)`
    - El patrón fire-and-forget con `.catch()` no cambia
    - _Requisitos: 1.4, 4.4_

  - [x] 3.3 Verificar que el retorno al cliente no incluye `passwordResetLink`
    - Confirmar que `return { success: true, data: { temporaryPassword } }` permanece igual
    - Confirmar que `passwordResetLink` no aparece en ningún resultado retornado al cliente
    - _Requisitos: 4.1, 4.4_

- [x] 4. Checkpoint final — verificar la integración completa
  - Confirmar que el build de TypeScript compila sin errores en ambos archivos
  - Confirmar que `sendInstructorRejectionEmail` no fue modificada
  - Confirmar que el orden de operaciones se preserva: aprobación → inserción en `practitioners` → generación del link → envío de email → retorno al cliente
  - Asegúrate de que todos los tests pasan, pregunta al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para una entrega más rápida
- Solo se modifican dos archivos: `src/lib/email.ts` y `instructorAccountRequestActions.ts`
- El orden de operaciones en la action es crítico: el link se genera _después_ de la inserción en `practitioners` para no bloquear la aprobación si `generateLink` falla
- La generación del link usa `await` explícito (no fire-and-forget) para que su resultado esté disponible antes de llamar al email, pero los errores se manejan localmente sin propagar al cliente

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4", "1.5", "1.6", "3.1"] },
    { "id": 4, "tasks": ["3.2"] },
    { "id": 5, "tasks": ["3.3"] }
  ]
}
```

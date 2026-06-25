# Requirements Document

## Introduction

Cuando un administrador aprueba la solicitud de cuenta de un instructor en Kombat ID, el sistema envía un correo de bienvenida. El correo actual (`sendInstructorApprovalEmail`) muestra la contraseña temporal pero dirige al instructor a `/login` con un link estático, sin ofrecer un camino directo para establecer su contraseña.

Este feature reemplaza ese comportamiento: la función `sendInstructorApprovalEmail` en `src/lib/email.ts` pasa a recibir además un link de reset de contraseña generado por Supabase. La action `approveInstructorAccountRequestAction` genera dicho link vía `adminSupabase.auth.admin.generateLink({ type: 'recovery', email })` y lo pasa a la función de email. El correo resultante tiene tono y estructura similar a `sendStudentWelcomeEmail`, mostrando las credenciales temporales junto a un botón de llamada a la acción que lleva directamente al flujo de cambio de contraseña (`/update-password`).

## Glossary

- **Email Service**: Módulo `src/lib/email.ts` que encapsula todas las funciones de envío de correos usando Resend.
- **sendInstructorApprovalEmail**: Función exportada del Email Service que compone y envía el correo de bienvenida al instructor aprobado.
- **approveInstructorAccountRequestAction**: Server Action ubicada en `src/modules/instructor-account-requests/presentation/actions/instructorAccountRequestActions.ts` que orquesta la aprobación de la solicitud del instructor.
- **Password Reset Link**: URL de un solo uso generada por `adminSupabase.auth.admin.generateLink({ type: 'recovery', email })` que redirige al flujo `/update-password` de Supabase.
- **SITE_URL**: Variable de entorno `NEXT_PUBLIC_SITE_URL` utilizada como base para construir URLs absolutas en los correos.
- **adminSupabase**: Cliente de Supabase con privilegios de administrador disponible en la action de aprobación.

## Requirements

### Requirement 1 — Generación del link de reset de contraseña

**User Story:** Como administrador que aprueba una solicitud de instructor, quiero que el sistema genere automáticamente un link de acceso directo para el instructor, para que el instructor pueda establecer su contraseña sin pasos adicionales.

#### Acceptance Criteria

1. WHEN `approveInstructorAccountRequestAction` aprueba exitosamente una solicitud, THE `approveInstructorAccountRequestAction` SHALL generar un Password Reset Link llamando a `adminSupabase.auth.admin.generateLink({ type: 'recovery', email: request.email })` utilizando el correo electrónico del instructor de la solicitud aprobada.

2. WHEN `adminSupabase.auth.admin.generateLink` retorna sin error, THE `approveInstructorAccountRequestAction` SHALL extraer la propiedad `data.properties.action_link` del resultado y pasarla como argumento a `sendInstructorApprovalEmail`.

3. IF `adminSupabase.auth.admin.generateLink` retorna un error, THEN THE `approveInstructorAccountRequestAction` SHALL pasar `null` o `undefined` como valor del link a `sendInstructorApprovalEmail` sin interrumpir el flujo de aprobación.

4. THE `approveInstructorAccountRequestAction` SHALL invocar `sendInstructorApprovalEmail` con los argumentos `(email, fullName, temporaryPassword, passwordResetLink)` manteniendo el comportamiento de fire-and-forget con `.catch()` para no bloquear la respuesta al cliente.

### Requirement 2 — Firma actualizada de sendInstructorApprovalEmail

**User Story:** Como desarrollador que mantiene el Email Service, quiero que `sendInstructorApprovalEmail` acepte el link de reset de contraseña como parámetro explícito, para que la función pueda incluirlo en el correo sin depender de la lógica de la action.

#### Acceptance Criteria

1. THE `sendInstructorApprovalEmail` SHALL aceptar un cuarto parámetro `passwordResetLink: string | null | undefined` de tipo opcional.

2. WHEN `passwordResetLink` contiene un valor de tipo string no vacío, THE `sendInstructorApprovalEmail` SHALL utilizar dicho valor como `href` del botón de llamada a la acción del correo.

3. IF `passwordResetLink` es `null`, `undefined` o cadena vacía, THEN THE `sendInstructorApprovalEmail` SHALL utilizar como fallback `${SITE_URL}/login` como `href` del botón de llamada a la acción.

4. THE `Email Service` SHALL exportar `sendInstructorApprovalEmail` con la misma signatura de retorno `Promise<void>`, sin cambios en el tipo de retorno.

### Requirement 3 — Diseño y contenido del correo de bienvenida

**User Story:** Como instructor recién aprobado, quiero recibir un correo de bienvenida claro y con tono consistente al de otros correos de la plataforma, para entender cómo acceder y establecer mi contraseña de forma inmediata.

#### Acceptance Criteria

1. THE `sendInstructorApprovalEmail` SHALL utilizar el template `wrap()` del Email Service para envolver el contenido del correo, manteniendo la estructura HTML base del sistema.

2. THE `sendInstructorApprovalEmail` SHALL mostrar el nombre del instructor (`fullName`) destacado en el saludo de apertura, usando el mismo estilo de color `#F0E6C8` definido en `sendStudentWelcomeEmail`.

3. THE `sendInstructorApprovalEmail` SHALL incluir un bloque de credenciales con el correo electrónico del instructor y su contraseña temporal (`temporaryPassword`), usando el mismo diseño de cuadro con fondo `#0e0e0e` y borde `#3a2e10` del template de alumnos.

4. THE `sendInstructorApprovalEmail` SHALL incluir un botón de llamada a la acción con fondo `#C9A84C`, texto `#111111`, y etiqueta "Cambiar mi contraseña" o equivalente, que enlace al `passwordResetLink` o al fallback definido en Requirement 2.3.

5. THE `sendInstructorApprovalEmail` SHALL incluir texto de instrucción que indique al instructor que debe cambiar su contraseña a través del link proporcionado, y que el link es de uso único.

6. THE `sendInstructorApprovalEmail` SHALL incluir, debajo del botón, un enlace de texto plano con la misma URL para clientes de correo que no renderizan HTML, usando el color `#C9A84C` y el mismo patrón que los demás correos del sistema.

7. THE `sendInstructorApprovalEmail` SHALL enviar el correo con el subject `"Bienvenido a Kombat ID — Configura tu contraseña"` o equivalente que refleje la naturaleza del correo de bienvenida con link de acceso directo.

### Requirement 4 — Compatibilidad y no regresión

**User Story:** Como desarrollador que mantiene el sistema, quiero que el cambio en `sendInstructorApprovalEmail` no rompa ningún otro comportamiento existente, para evitar regresiones en el flujo de aprobación de instructores.

#### Acceptance Criteria

1. THE `approveInstructorAccountRequestAction` SHALL continuar retornando `{ success: true, data: { temporaryPassword } }` al cliente con la misma estructura después del cambio, sin agregar el `passwordResetLink` al resultado retornado al cliente.

2. THE `sendInstructorRejectionEmail` SHALL permanecer sin modificaciones al implementar este feature.

3. WHILE la generación del Password Reset Link está en curso, THE `approveInstructorAccountRequestAction` SHALL completar la aprobación de la solicitud y la creación del usuario en `practitioners` antes de generar el link, manteniendo el orden de operaciones actual.

4. IF la generación del Password Reset Link falla por cualquier motivo, THEN THE `approveInstructorAccountRequestAction` SHALL completar el retorno exitoso `{ success: true, data: { temporaryPassword } }` al cliente sin propagar el error de generación del link al resultado de la action.

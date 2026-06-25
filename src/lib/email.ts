import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "Kombat Taekwondo <no-reply@kombatchile.cl>";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kombat-id.vercel.app";

// ---------------------------------------------------------------------------
// Helper interno — envía el correo sin lanzar excepciones
// ---------------------------------------------------------------------------

async function send(to: string, subject: string, html: string): Promise<void> {
  // Debug: log the FROM address and partial API key to confirm env vars are loaded
  console.log("[email] FROM:", FROM);
  console.log(
    "[email] API key prefix:",
    process.env.RESEND_API_KEY?.slice(0, 8) ?? "NOT SET",
  );
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) {
    console.error("[email] Error al enviar correo:", error);
  }
}

// ---------------------------------------------------------------------------
// Template base — contenedor HTML compatible con clientes de correo
// ---------------------------------------------------------------------------

function wrap(content: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kombat Taekwondo</title>
</head>
<body style="margin:0;padding:0;background-color:#111111;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
               style="max-width:560px;width:100%;background-color:#1a1a1a;border:1px solid #3a2e10;border-radius:8px;">
          <!-- Barra dorada superior -->
          <tr><td style="height:4px;background-color:#C9A84C;border-radius:8px 8px 0 0;"></td></tr>
          <!-- Encabezado -->
          <tr>
            <td style="padding:28px 36px 20px;border-bottom:1px solid #2a2a2a;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#C9A84C;letter-spacing:2px;text-transform:uppercase;">
                Kombat Taekwondo
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:#666655;letter-spacing:1px;text-transform:uppercase;">Chile</p>
            </td>
          </tr>
          <!-- Contenido -->
          <tr><td style="padding:28px 36px;">${content}</td></tr>
          <!-- Pie -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid #2a2a2a;">
              <p style="margin:0;font-size:11px;color:#555544;text-align:center;">
                Este es un correo automático. Por favor no respondas a este mensaje.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#555544;text-align:center;">
                &copy; ${year} Kombat Taekwondo Chile
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Correos de Árbitros
// ---------------------------------------------------------------------------

/**
 * Notifica al árbitro que su solicitud fue aprobada.
 * Su cuenta está lista; debe usar "¿Olvidaste tu contraseña?" para ingresar.
 */
export async function sendRefereeApprovalEmail(
  to: string,
  fullName: string,
): Promise<void> {
  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;color:#E8C96A;font-weight:700;">
      ¡Tu acreditación fue aprobada!
    </h1>
    <p style="margin:0 0 24px;font-size:12px;color:#888877;letter-spacing:1px;text-transform:uppercase;">
      Árbitro Oficial — Kombat Taekwondo Chile
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#ccbbaa;line-height:1.6;">
      Hola <strong style="color:#F0E6C8;">${fullName}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#ccbbaa;line-height:1.7;">
      Tu solicitud de acreditación como árbitro oficial ha sido
      <strong style="color:#E8C96A;">aprobada</strong>.
      Tu cuenta ha sido creada exitosamente en el sistema.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#ccbbaa;line-height:1.7;">
      Para acceder al portal de árbitros, ingresa en la página de inicio de sesión
      y usa la opción <strong style="color:#F0E6C8;">&ldquo;¿Olvidaste tu contraseña?&rdquo;</strong>
      con tu correo electrónico para establecer tu contraseña de acceso.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
      <tr>
        <td style="background-color:#C9A84C;border-radius:6px;">
          <a href="${SITE_URL}/login"
             style="display:block;padding:13px 32px;font-size:14px;font-weight:700;color:#111111;text-decoration:none;letter-spacing:0.5px;">
            Ir al portal
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:12px;color:#555544;">
      Si el botón no funciona, copia este enlace:
      <span style="color:#C9A84C;">${SITE_URL}/login</span>
    </p>
  `;

  await send(
    to,
    "Tu acreditación como árbitro fue aprobada — Kombat Taekwondo",
    wrap(content),
  );
}

/**
 * Notifica al árbitro que su solicitud fue rechazada.
 */
export async function sendRefereeRejectionEmail(
  to: string,
  fullName: string,
): Promise<void> {
  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;color:#E8C96A;font-weight:700;">
      Actualización sobre tu solicitud
    </h1>
    <p style="margin:0 0 24px;font-size:12px;color:#888877;letter-spacing:1px;text-transform:uppercase;">
      Registro de Árbitros — Kombat Taekwondo Chile
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#ccbbaa;line-height:1.6;">
      Hola <strong style="color:#F0E6C8;">${fullName}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#ccbbaa;line-height:1.7;">
      Lamentamos informarte que tu solicitud de acreditación como árbitro oficial
      de Kombat Taekwondo Chile no ha podido ser aprobada en esta oportunidad.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#ccbbaa;line-height:1.7;">
      Si tienes dudas o deseas más información, puedes contactarnos directamente
      o enviar una nueva solicitud cuando cuentes con los requisitos completos.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="border:1px solid #3a2e10;border-radius:6px;">
          <a href="${SITE_URL}/referee-registration"
             style="display:block;padding:13px 32px;font-size:14px;color:#C9A84C;text-decoration:none;letter-spacing:0.5px;">
            Enviar nueva solicitud
          </a>
        </td>
      </tr>
    </table>
  `;

  await send(
    to,
    "Actualización sobre tu solicitud de árbitro — Kombat Taekwondo",
    wrap(content),
  );
}

// ---------------------------------------------------------------------------
// Correos de Instructores
// ---------------------------------------------------------------------------

/**
 * Notifica al instructor que su solicitud fue aprobada y le entrega
 * sus credenciales de acceso temporal.
 */
export async function sendInstructorApprovalEmail(
  to: string,
  fullName: string,
  temporaryPassword: string,
): Promise<void> {
  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;color:#E8C96A;font-weight:700;">
      ¡Tu cuenta de instructor fue aprobada!
    </h1>
    <p style="margin:0 0 24px;font-size:12px;color:#888877;letter-spacing:1px;text-transform:uppercase;">
      Instructor — Kombat Taekwondo Chile
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#ccbbaa;line-height:1.6;">
      Hola <strong style="color:#F0E6C8;">${fullName}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#ccbbaa;line-height:1.7;">
      Tu solicitud de cuenta de instructor en Kombat Taekwondo Chile ha sido
      <strong style="color:#E8C96A;">aprobada</strong>.
      A continuación encontrarás tus credenciales de acceso temporal.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
           style="margin:0 0 24px;background-color:#0e0e0e;border:1px solid #3a2e10;border-radius:6px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:11px;color:#888877;text-transform:uppercase;letter-spacing:1.5px;">
            Credenciales de acceso
          </p>
          <p style="margin:0 0 10px;font-size:14px;color:#ccbbaa;">
            <span style="color:#888877;">Correo:&nbsp;</span>
            <strong style="color:#F0E6C8;">${to}</strong>
          </p>
          <p style="margin:0;font-size:14px;color:#ccbbaa;">
            <span style="color:#888877;">Contraseña temporal:&nbsp;</span>
            <strong style="color:#E8C96A;font-family:monospace;font-size:16px;letter-spacing:1px;">
              ${temporaryPassword}
            </strong>
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:14px;color:#ccbbaa;line-height:1.7;">
      Ingresa por primera vez con las credenciales indicadas arriba.
      El sistema te <strong style="color:#F0E6C8;">pedirá cambiar tu contraseña</strong> de forma automática al iniciar sesión.
    </p>
    <p style="margin:0;font-size:13px;color:#888877;line-height:1.7;">
      Accede desde:
      <a href="${SITE_URL}/login" style="color:#C9A84C;text-decoration:none;">${SITE_URL}/login</a>
    </p>
  `;

  await send(
    to,
    "Bienvenido a Kombat ID — Tu cuenta de instructor está lista",
    wrap(content),
  );
}

/**
 * Notifica al instructor que su solicitud fue rechazada.
 */
export async function sendInstructorRejectionEmail(
  to: string,
  fullName: string,
): Promise<void> {
  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;color:#E8C96A;font-weight:700;">
      Actualización sobre tu solicitud
    </h1>
    <p style="margin:0 0 24px;font-size:12px;color:#888877;letter-spacing:1px;text-transform:uppercase;">
      Solicitud de Instructor — Kombat Taekwondo Chile
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#ccbbaa;line-height:1.6;">
      Hola <strong style="color:#F0E6C8;">${fullName}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#ccbbaa;line-height:1.7;">
      Lamentamos informarte que tu solicitud de cuenta de instructor en
      Kombat Taekwondo Chile no ha podido ser aprobada en esta oportunidad.
    </p>
    <p style="margin:0;font-size:14px;color:#ccbbaa;line-height:1.7;">
      Si tienes dudas o necesitas más información, puedes ponerte en contacto
      con nosotros directamente.
    </p>
  `;

  await send(
    to,
    "Actualización sobre tu solicitud de instructor — Kombat Taekwondo",
    wrap(content),
  );
}

// ---------------------------------------------------------------------------
// Correos de Alumnos
// ---------------------------------------------------------------------------

/**
 * Notifica al alumno que su cuenta fue creada por su instructor,
 * entregándole su contraseña temporal y las instrucciones para ingresar.
 */
export async function sendStudentWelcomeEmail(
  to: string,
  fullName: string,
  temporaryPassword: string,
): Promise<void> {
  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;color:#E8C96A;font-weight:700;">
      ¡Tu cuenta ha sido creada!
    </h1>
    <p style="margin:0 0 24px;font-size:12px;color:#888877;letter-spacing:1px;text-transform:uppercase;">
      Alumno — Kombat Taekwondo Chile
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#ccbbaa;line-height:1.6;">
      Hola <strong style="color:#F0E6C8;">${fullName}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#ccbbaa;line-height:1.7;">
      Tu instructor te ha registrado en <strong style="color:#E8C96A;">Kombat ID</strong>,
      la plataforma oficial de Kombat Taekwondo Chile. A continuación encontrarás
      tus credenciales de acceso temporal.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
           style="margin:0 0 24px;background-color:#0e0e0e;border:1px solid #3a2e10;border-radius:6px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:11px;color:#888877;text-transform:uppercase;letter-spacing:1.5px;">
            Credenciales de acceso
          </p>
          <p style="margin:0 0 10px;font-size:14px;color:#ccbbaa;">
            <span style="color:#888877;">Correo:&nbsp;</span>
            <strong style="color:#F0E6C8;">${to}</strong>
          </p>
          <p style="margin:0;font-size:14px;color:#ccbbaa;">
            <span style="color:#888877;">Contraseña temporal:&nbsp;</span>
            <strong style="color:#E8C96A;font-family:monospace;font-size:16px;letter-spacing:1px;">
              ${temporaryPassword}
            </strong>
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:14px;color:#ccbbaa;line-height:1.7;">
      Al ingresar por primera vez, la plataforma te pedirá que
      <strong style="color:#F0E6C8;">establezcas una contraseña personal</strong>.
      Hazlo de inmediato para proteger tu cuenta.
    </p>
    <p style="margin:0 0 24px;font-size:13px;color:#888877;line-height:1.7;">
      Desde tu perfil podrás ver tu historial marcial, descargar tus
      certificaciones y compartir tu QR de identidad.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
      <tr>
        <td style="background-color:#C9A84C;border-radius:6px;">
          <a href="${SITE_URL}/login"
             style="display:block;padding:13px 32px;font-size:14px;font-weight:700;color:#111111;text-decoration:none;letter-spacing:0.5px;">
            Ingresar a Kombat ID
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:12px;color:#555544;">
      Si el botón no funciona, copia este enlace:
      <span style="color:#C9A84C;">${SITE_URL}/login</span>
    </p>
  `;

  await send(
    to,
    "Tu cuenta en Kombat ID está lista — Kombat Taekwondo",
    wrap(content),
  );
}

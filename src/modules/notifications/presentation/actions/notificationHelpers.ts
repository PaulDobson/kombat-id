import { DrizzleNotificationRepository } from "../../infrastructure/repositories/drizzleNotificationRepository";
import { createNotification } from "../../application/use-cases/createNotification";
import { NotificationType } from "../../domain/enums/notificationType";
import { NotificationCategory } from "../../domain/enums/notificationCategory";
import { NotificationPriority } from "../../domain/enums/notificationPriority";

/**
 * Helper: Notifica a los administradores que hay un nuevo alumno pendiente de autorización
 * Uso: Llamar desde el Server Action de registro de instructor
 */
export async function notifyAdminsNewStudent(data: {
  studentId: string;
  studentName: string;
  studentRut: string;
  instructorId: string;
  instructorName: string;
}): Promise<void> {
  const notificationRepo = new DrizzleNotificationRepository();

  await createNotification(
    {
      type: NotificationType.NEW_STUDENT_PENDING,
      category: NotificationCategory.APPROVAL,
      priority: NotificationPriority.HIGH,
      title: "Nuevo alumno pendiente de autorización",
      message: `${data.instructorName} ha registrado a ${data.studentName} (${data.studentRut})`,
      actionUrl: "/admin/practitioners/pending-activation",
      actionLabel: "Ver solicitud",
      metadata: {
        studentId: data.studentId,
        studentName: data.studentName,
        studentRut: data.studentRut,
        instructorId: data.instructorId,
        instructorName: data.instructorName,
      },
      actorUserId: data.instructorId,
      actorName: data.instructorName,
      relatedEntityType: "practitioner",
      relatedEntityId: data.studentId,
      expiresInDays: null,

      // Dirigida a usuarios específicos: admins
      recipientStrategy: "specific_users",
      specificUserIds: undefined, // Se resolverán los admin_users en el use case
    },
    { notificationRepo },
  );
}

/**
 * Helper: Notifica a todos los instructores que se publicó un nuevo evento
 * Uso: Llamar desde el Server Action de creación de eventos
 */
export async function notifyInstructorsEventPublished(data: {
  eventId: string;
  eventName: string;
  eventType: string;
  eventDate: string;
  eventScope: string;
  publishedByName: string;
  publishedByUserId: string;
}): Promise<void> {
  const notificationRepo = new DrizzleNotificationRepository();

  await createNotification(
    {
      type: NotificationType.EVENT_PUBLISHED,
      category: NotificationCategory.EVENT,
      priority: NotificationPriority.NORMAL,
      title: "Nuevo evento publicado",
      message: `${data.publishedByName} ha publicado ${data.eventName} (${data.eventDate})`,
      actionUrl: `/events/${data.eventId}`,
      actionLabel: "Ver evento",
      metadata: {
        eventId: data.eventId,
        eventName: data.eventName,
        eventType: data.eventType,
        eventDate: data.eventDate,
        eventScope: data.eventScope,
      },
      actorUserId: data.publishedByUserId,
      actorName: data.publishedByName,
      relatedEntityType: "event",
      relatedEntityId: data.eventId,
      expiresInDays: 30, // La notificación de evento expira en 30 días

      // Broadcast a todos los instructores
      recipientStrategy: "role_based",
      roles: ["instructor", "profesor", "maestro"],
    },
    { notificationRepo },
  );
}

/**
 * Helper: Notifica al instructor que su alumno ha sido activado por un administrador
 * Uso: Llamar desde el Server Action de activación de practicantes
 */
export async function notifyInstructorStudentActivated(data: {
  studentId: string;
  studentName: string;
  instructorId: string;
  instructorName: string;
  activatedByName: string;
  activatedByUserId: string;
}): Promise<void> {
  const notificationRepo = new DrizzleNotificationRepository();

  await createNotification(
    {
      type: NotificationType.ACCOUNT_VERIFIED,
      category: NotificationCategory.APPROVAL,
      priority: NotificationPriority.HIGH,
      title: "Alumno activado",
      message: `${data.activatedByName} ha activado a ${data.studentName}. El alumno ya puede usar el sistema.`,
      actionUrl: `/instructor/students/${data.studentId}`,
      actionLabel: "Ver alumno",
      metadata: {
        studentId: data.studentId,
        studentName: data.studentName,
        instructorId: data.instructorId,
        activatedBy: data.activatedByUserId,
      },
      actorUserId: data.activatedByUserId,
      actorName: data.activatedByName,
      relatedEntityType: "practitioner",
      relatedEntityId: data.studentId,
      expiresInDays: null,

      // Dirigida al instructor específico que registró al alumno
      recipientStrategy: "specific_users",
      specificUserIds: [data.instructorId], // Auth user ID del instructor
    },
    { notificationRepo },
  );
}

/**
 * Helper: Notifica al instructor que su solicitud de certificación fue aprobada
 * Uso: Llamar desde el Server Action de aprobación de certificaciones
 */
export async function notifyCertificationRequestApproved(data: {
  requestId: string;
  certType: string;
  studentId: string;
  studentName: string;
  instructorUserId: string;
  approvedByUserId: string;
  approvedByName: string;
}): Promise<void> {
  const notificationRepo = new DrizzleNotificationRepository();

  await createNotification(
    {
      type: NotificationType.CERT_REQUEST_APPROVED,
      category: NotificationCategory.CERTIFICATION,
      priority: NotificationPriority.HIGH,
      title: "Solicitud de certificación aprobada",
      message: `Tu solicitud de certificación para ${data.studentName} ha sido aprobada`,
      actionUrl: `/certifications`,
      actionLabel: "Ver certificación",
      metadata: {
        requestId: data.requestId,
        certType: data.certType,
        studentId: data.studentId,
        studentName: data.studentName,
        approvedByUserId: data.approvedByUserId,
        approvedByName: data.approvedByName,
      },
      actorUserId: data.approvedByUserId,
      actorName: data.approvedByName,
      relatedEntityType: "certification_request",
      relatedEntityId: data.requestId,
      expiresInDays: null,

      // Dirigida al instructor solicitante
      recipientStrategy: "specific_users",
      specificUserIds: [data.instructorUserId],
    },
    { notificationRepo },
  );
}

/**
 * Helper: Notifica al practicante que su grado fue actualizado
 * Uso: Llamar desde el Server Action de actualización de grados
 */
export async function notifyGradeUpdated(data: {
  practitionerId: string;
  practitionerUserId: string;
  practitionerName: string;
  newGrade: string;
  newDan: number | null;
  updatedByUserId: string;
  updatedByName: string;
}): Promise<void> {
  const notificationRepo = new DrizzleNotificationRepository();

  const gradeLabel = data.newDan
    ? `${data.newGrade} ${data.newDan}º Dan`
    : data.newGrade;

  await createNotification(
    {
      type: NotificationType.GRADE_UPDATED,
      category: NotificationCategory.APPROVAL,
      priority: NotificationPriority.HIGH,
      title: "Grado actualizado",
      message: `Tu grado ha sido actualizado a ${gradeLabel}`,
      actionUrl: "/martial-history",
      actionLabel: "Ver historial",
      metadata: {
        practitionerId: data.practitionerId,
        practitionerName: data.practitionerName,
        newGrade: data.newGrade,
        newDan: data.newDan,
        updatedByUserId: data.updatedByUserId,
        updatedByName: data.updatedByName,
      },
      actorUserId: data.updatedByUserId,
      actorName: data.updatedByName,
      relatedEntityType: "practitioner",
      relatedEntityId: data.practitionerId,
      expiresInDays: null,

      // Dirigida al practicante
      recipientStrategy: "specific_users",
      specificUserIds: [data.practitionerUserId],
    },
    { notificationRepo },
  );
}

/**
 * Puerto de dominio para resolver destinatarios de notificaciones.
 * Permite desacoplar el caso de uso de la tecnología de persistencia.
 */
export interface NotificationRecipientResolver {
  getAdminUserIds(): Promise<string[]>;
  getUsersByRoles(roles: string[]): Promise<string[]>;
  getUsersByAcademy(academyId: string): Promise<string[]>;
  getAllAuthenticatedUsers(): Promise<string[]>;
}

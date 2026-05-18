// Domain entity — zero framework imports

export type InstructorAccountRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "observed";

export interface InstructorAccountRequest {
  id: string; // UUID
  email: string; // Email del instructor solicitante
  fullName: string; // Nombre completo
  rut: string; // RUT chileno (formato: 12345678-9)
  phone: string | null; // Teléfono de contacto (opcional)
  academyName: string | null; // Academia o club de origen (opcional)
  message: string | null; // Mensaje o motivación (opcional)
  status: InstructorAccountRequestStatus;
  authUserId: string | null; // Vinculado al aprobar
  approvedAt: string | null; // ISO timestamp
  approvedBy: string | null; // UUID del admin que aprobó
  rejectedAt: string | null; // ISO timestamp
  rejectedBy: string | null; // UUID del admin que rechazó
  observationNotes: string | null; // Nota del admin al observar
  observedAt: string | null; // ISO timestamp
  observedBy: string | null; // UUID del admin que observó
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Verifica si una transición de estado es válida.
 *
 * Transiciones válidas:
 *   pending → approved
 *   pending → rejected
 *   pending → observed
 *
 * Todas las demás transiciones (incluyendo approved → rejected,
 * rejected → approved, observed → approved, cualquier → pending, etc.)
 * son inválidas.
 *
 * Función pura: dados los mismos argumentos siempre retorna el mismo resultado.
 *
 * Validates: Requirements 7.1, 7.2, 7.3
 */
export function isValidStatusTransition(
  current: InstructorAccountRequestStatus,
  next: InstructorAccountRequestStatus,
): boolean {
  return (
    current === "pending" &&
    (next === "approved" || next === "rejected" || next === "observed")
  );
}

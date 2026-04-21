export type RegistrationStatus = "pendiente_pago" | "confirmada" | "cancelada";

export interface EventRegistration {
  id: string;
  eventId: string;
  practitionerId: string;
  instructorId: string;
  status: RegistrationStatus;
  registeredAt: string; // ISO timestamp
  confirmedAt: string | null;
  confirmedBy: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Determina el status inicial según si el evento es gratuito o de pago */
export function determineInitialStatus(
  registrationFee: number | null,
): RegistrationStatus {
  return registrationFee === null || registrationFee === 0
    ? "confirmada"
    : "pendiente_pago";
}

/** Formatea el precio de inscripción en CLP */
export function formatRegistrationFee(fee: number | null): string {
  if (fee === null || fee === 0) return "Entrada libre";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(fee);
}

/** Verifica si un evento tiene aforo disponible */
export function hasCapacity(
  maxParticipants: number | null,
  confirmedCount: number,
): boolean {
  if (maxParticipants === null) return true;
  return confirmedCount < maxParticipants;
}

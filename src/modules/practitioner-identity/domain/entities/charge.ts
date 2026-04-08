/** Req 12.1 — Tipos de cobro soportados */
export type ChargeType =
  | "examen_grado"
  | "membresia_anual"
  | "licencia_competencia";

/** Req 12.3 — Estados de pago de un cobro */
export type ChargeStatus = "pendiente" | "pagado" | "vencido" | "exento";

/** Req 12.2 — Monedas soportadas (CLP por defecto) */
export type Currency = "CLP" | "USD";

/** Req 12.2 — Cobro asociado a un practicante */
export interface Charge {
  id: string; // UUID
  practitionerId: string; // UUID del practicante
  chargeType: ChargeType;
  amount: number;
  currency: Currency;
  status: ChargeStatus;
  dueDate: string; // ISO date string (YYYY-MM-DD)
  periodStart: string; // ISO date string (YYYY-MM-DD)
  periodEnd: string; // ISO date string (YYYY-MM-DD)
  paidAt: string | null; // ISO datetime string
  paymentReference: string | null;
  exemptionReason: string | null;
  exemptedBy: string | null; // UUID del admin que otorgó la exención
  createdBy: string; // UUID del admin que creó el cobro
  createdAt: string; // ISO datetime string
  updatedAt: string; // ISO datetime string
}

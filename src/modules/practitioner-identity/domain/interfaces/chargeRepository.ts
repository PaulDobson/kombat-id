import type { Charge, ChargeStatus, ChargeType } from "../entities/charge";

export interface ChargeRepository {
  findById(id: string): Promise<Charge | null>;
  findByPractitioner(practitionerId: string): Promise<Charge[]>;
  /** Returns pending charges of a given type for a practitioner (Req 12.5) */
  findPendingByPractitionerAndType(
    practitionerId: string,
    chargeType: ChargeType,
  ): Promise<Charge[]>;
  /**
   * Req 12.5 — Returns charges with status 'pendiente' OR 'vencido' for a
   * given practitioner and charge type. Used to block certification issuance.
   */
  findBlockingCharges(
    practitionerId: string,
    chargeType: ChargeType,
  ): Promise<Charge[]>;
  save(charge: Charge): Promise<void>;
  updateStatus(
    id: string,
    status: ChargeStatus,
    metadata?: {
      paidAt?: string;
      paymentReference?: string;
      exemptionReason?: string;
      exemptedBy?: string;
    },
  ): Promise<void>;
  /** Req 12.4 — Marks overdue pending charges; returns the count of updated records */
  expireOverdue(referenceDate: string): Promise<number>;
}

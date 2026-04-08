import { z } from "zod";
import type {
  Charge,
  ChargeType,
  Currency,
} from "../../domain/entities/charge";
import type { ChargeRepository } from "../../domain/interfaces/chargeRepository";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import {
  PractitionerNotFoundError,
  PractitionerInactiveError,
} from "../../domain/errors";

export const CreateChargeInputSchema = z.object({
  practitionerId: z.string().uuid(),
  chargeType: z.enum([
    "examen_grado",
    "membresia_anual",
    "licencia_competencia",
  ]),
  amount: z.number().positive(),
  currency: z.enum(["CLP", "USD"]).default("CLP"),
  dueDate: z.string().min(1), // ISO date string YYYY-MM-DD
  periodStart: z.string().min(1), // ISO date string YYYY-MM-DD
  periodEnd: z.string().min(1), // ISO date string YYYY-MM-DD
  adminId: z.string().uuid(),
});

export type CreateChargeInput = z.infer<typeof CreateChargeInputSchema>;

/**
 * Req 12.3, 12.7 — Admin creates a charge for a practitioner.
 */
export async function createCharge(
  input: CreateChargeInput,
  deps: {
    chargeRepo: ChargeRepository;
    practitionerRepo: PractitionerRepository;
  },
): Promise<{ chargeId: string }> {
  CreateChargeInputSchema.parse(input);

  const practitioner = await deps.practitionerRepo.findById(
    input.practitionerId,
  );
  if (!practitioner) {
    throw new PractitionerNotFoundError(input.practitionerId);
  }
  if (!practitioner.isActive) {
    throw new PractitionerInactiveError(input.practitionerId);
  }

  const now = new Date().toISOString();

  const charge: Charge = {
    id: crypto.randomUUID(),
    practitionerId: input.practitionerId,
    chargeType: input.chargeType as ChargeType,
    amount: input.amount,
    currency: input.currency as Currency,
    status: "pendiente",
    dueDate: input.dueDate,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    paidAt: null,
    paymentReference: null,
    exemptionReason: null,
    exemptedBy: null,
    createdBy: input.adminId,
    createdAt: now,
    updatedAt: now,
  };

  await deps.chargeRepo.save(charge);

  return { chargeId: charge.id };
}

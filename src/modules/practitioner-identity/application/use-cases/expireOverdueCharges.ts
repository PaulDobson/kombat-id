import { z } from "zod";
import type { ChargeRepository } from "../../domain/interfaces/chargeRepository";

export const ExpireOverdueChargesInputSchema = z.object({
  referenceDate: z.string().min(1).optional(), // ISO date string YYYY-MM-DD; defaults to today
});

export type ExpireOverdueChargesInput = z.infer<
  typeof ExpireOverdueChargesInputSchema
>;

/**
 * Req 12.4 — Internal job: marks all pending charges past their due date as 'vencido'.
 * Returns the count of updated charges.
 */
export async function expireOverdueCharges(
  input: ExpireOverdueChargesInput,
  deps: {
    chargeRepo: ChargeRepository;
  },
): Promise<{ expiredCount: number }> {
  ExpireOverdueChargesInputSchema.parse(input);

  const referenceDate =
    input.referenceDate ?? new Date().toISOString().slice(0, 10);

  const expiredCount = await deps.chargeRepo.expireOverdue(referenceDate);

  return { expiredCount };
}

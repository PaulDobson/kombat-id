import { z } from "zod";
import type { Charge } from "../../domain/entities/charge";
import type { ChargeRepository } from "../../domain/interfaces/chargeRepository";

export const GetPractitionerEconomicSummaryInputSchema = z.object({
  practitionerId: z.string().uuid(),
});

export type GetPractitionerEconomicSummaryInput = z.infer<
  typeof GetPractitionerEconomicSummaryInputSchema
>;

export interface PractitionerEconomicSummary {
  charges: Charge[];
  pendingCount: number;
  overdueCount: number;
  paidCount: number;
  exemptCount: number;
}

/**
 * Req 12.10 — Returns an economic summary for a practitioner including all charges
 * and counts by status.
 */
export async function getPractitionerEconomicSummary(
  input: GetPractitionerEconomicSummaryInput,
  deps: {
    chargeRepo: ChargeRepository;
  },
): Promise<PractitionerEconomicSummary> {
  GetPractitionerEconomicSummaryInputSchema.parse(input);

  const charges = await deps.chargeRepo.findByPractitioner(
    input.practitionerId,
  );

  const pendingCount = charges.filter((c) => c.status === "pendiente").length;
  const overdueCount = charges.filter((c) => c.status === "vencido").length;
  const paidCount = charges.filter((c) => c.status === "pagado").length;
  const exemptCount = charges.filter((c) => c.status === "exento").length;

  return {
    charges,
    pendingCount,
    overdueCount,
    paidCount,
    exemptCount,
  };
}

import { z } from "zod";
import type { ChargeRepository } from "../../domain/interfaces/chargeRepository";
import { DomainError } from "@/lib/errors";

export const MarkChargeExemptInputSchema = z.object({
  chargeId: z.string().uuid(),
  exemptionReason: z.string().min(1, "Exemption reason is required"),
  adminId: z.string().uuid(),
});

export type MarkChargeExemptInput = z.infer<typeof MarkChargeExemptInputSchema>;

/**
 * Req 12.8 — Admin marks a charge as exempt with a mandatory justification.
 * Only charges with status 'pendiente' or 'vencido' can be exempted.
 */
export async function markChargeExempt(
  input: MarkChargeExemptInput,
  deps: {
    chargeRepo: ChargeRepository;
  },
): Promise<void> {
  MarkChargeExemptInputSchema.parse(input);

  const charge = await deps.chargeRepo.findById(input.chargeId);
  if (!charge) {
    throw new DomainError(`Charge not found: ${input.chargeId}`);
  }

  if (charge.status !== "pendiente" && charge.status !== "vencido") {
    throw new DomainError(
      `Cannot exempt charge with status '${charge.status}'. Only 'pendiente' or 'vencido' charges can be exempted.`,
    );
  }

  await deps.chargeRepo.updateStatus(input.chargeId, "exento", {
    exemptionReason: input.exemptionReason,
    exemptedBy: input.adminId,
  });
}

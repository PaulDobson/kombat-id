import { z } from "zod";
import type { ChargeRepository } from "../../domain/interfaces/chargeRepository";
import { DomainError } from "@/lib/errors";

export const RegisterPaymentInputSchema = z.object({
  chargeId: z.string().uuid(),
  paidAt: z.string().min(1), // ISO datetime string
  paymentReference: z.string().min(1),
  adminId: z.string().uuid(),
});

export type RegisterPaymentInput = z.infer<typeof RegisterPaymentInputSchema>;

/**
 * Req 12.7 — Admin manually registers a payment for a charge.
 * Only charges with status 'pendiente' or 'vencido' can be paid.
 */
export async function registerPayment(
  input: RegisterPaymentInput,
  deps: {
    chargeRepo: ChargeRepository;
  },
): Promise<void> {
  RegisterPaymentInputSchema.parse(input);

  const charge = await deps.chargeRepo.findById(input.chargeId);
  if (!charge) {
    throw new DomainError(`Charge not found: ${input.chargeId}`);
  }

  if (charge.status !== "pendiente" && charge.status !== "vencido") {
    throw new DomainError(
      `Cannot register payment for charge with status '${charge.status}'. Only 'pendiente' or 'vencido' charges can be paid.`,
    );
  }

  await deps.chargeRepo.updateStatus(input.chargeId, "pagado", {
    paidAt: input.paidAt,
    paymentReference: input.paymentReference,
  });
}

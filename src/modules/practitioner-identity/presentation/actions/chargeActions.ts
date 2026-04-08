"use server";

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import { DrizzleChargeRepository } from "../../infrastructure/repositories/drizzleChargeRepository";
import { DrizzlePractitionerRepository } from "../../infrastructure/repositories/drizzlePractitionerRepository";
import {
  createCharge,
  CreateChargeInputSchema,
} from "../../application/use-cases/createCharge";
import {
  registerPayment,
  RegisterPaymentInputSchema,
} from "../../application/use-cases/registerPayment";
import {
  markChargeExempt,
  MarkChargeExemptInputSchema,
} from "../../application/use-cases/markChargeExempt";
import {
  getPractitionerEconomicSummary,
  GetPractitionerEconomicSummaryInputSchema,
  type PractitionerEconomicSummary,
} from "../../application/use-cases/getPractitionerEconomicSummary";
import {
  PractitionerNotFoundError,
  PractitionerInactiveError,
} from "../../domain/errors";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

async function requireAdmin(): Promise<{ userId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await adminSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return { userId: user.id };
}

export async function createChargeAction(
  rawInput: unknown,
): Promise<ActionResult<{ chargeId: string }>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = CreateChargeInputSchema.safeParse({
    ...(rawInput as object),
    adminId: admin.userId,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const chargeRepo = new DrizzleChargeRepository();
    const practitionerRepo = new DrizzlePractitionerRepository();
    const result = await createCharge(parsed.data, {
      chargeRepo,
      practitionerRepo,
    });
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof PractitionerNotFoundError) {
      return {
        success: false,
        error: "Practicante no encontrado",
        code: "NOT_FOUND",
      };
    }
    if (err instanceof PractitionerInactiveError) {
      return {
        success: false,
        error: "No se puede crear un cobro para un practicante inactivo",
        code: "PRACTITIONER_INACTIVE",
      };
    }
    console.error("[createChargeAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function registerPaymentAction(
  rawInput: unknown,
): Promise<ActionResult<void>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = RegisterPaymentInputSchema.safeParse({
    ...(rawInput as object),
    adminId: admin.userId,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const chargeRepo = new DrizzleChargeRepository();
    await registerPayment(parsed.data, { chargeRepo });
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof DomainError) {
      return { success: false, error: err.message, code: "DOMAIN_ERROR" };
    }
    console.error("[registerPaymentAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function markChargeExemptAction(
  rawInput: unknown,
): Promise<ActionResult<void>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = MarkChargeExemptInputSchema.safeParse({
    ...(rawInput as object),
    adminId: admin.userId,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const chargeRepo = new DrizzleChargeRepository();
    await markChargeExempt(parsed.data, { chargeRepo });
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof DomainError) {
      return { success: false, error: err.message, code: "DOMAIN_ERROR" };
    }
    console.error("[markChargeExemptAction] Unexpected error:", err);
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

export async function getPractitionerEconomicSummaryAction(
  rawInput: unknown,
): Promise<ActionResult<PractitionerEconomicSummary>> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };
  }

  const parsed = GetPractitionerEconomicSummaryInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.message,
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const chargeRepo = new DrizzleChargeRepository();
    const summary = await getPractitionerEconomicSummary(parsed.data, {
      chargeRepo,
    });
    return { success: true, data: summary };
  } catch (err) {
    console.error(
      "[getPractitionerEconomicSummaryAction] Unexpected error:",
      err,
    );
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

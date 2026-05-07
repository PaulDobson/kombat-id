"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SupabaseRefereePortalPublicationRepository } from "../../infrastructure/repositories/supabaseRefereePortalPublicationRepository";
import { SupabaseRefereeEventRegistrationRepository } from "../../infrastructure/repositories/supabaseRefereeEventRegistrationRepository";
import { registerForEvent } from "../../application/use-cases/registerForEvent";
import { unregisterFromEvent } from "../../application/use-cases/unregisterFromEvent";
import {
  NotAnEventError,
  AlreadyRegisteredForEventError,
  EventAtCapacityError,
  RegistrationDeadlinePassedError,
  RefereeEventRegistrationNotFoundError,
} from "../../domain/errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

const REFEREE_DASHBOARD_PATH = "/referee/dashboard";

// ---------------------------------------------------------------------------
// Auth helper — verifies the user has role "referee"
// ---------------------------------------------------------------------------

async function requireReferee(): Promise<{ refereeUserId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const role = user.app_metadata?.role as string | undefined;
  if (role !== "referee") return null;

  return { refereeUserId: user.id };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Registers the authenticated referee for an event.
 * Validates: Requisitos 4.1, 4.2, 4.4, 4.5, 4.6, 7.3
 */
export async function registerForEventAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const referee = await requireReferee();
  if (!referee) {
    return { success: false, error: "Acceso denegado.", code: "FORBIDDEN" };
  }

  const parsed = z
    .object({ publicationId: z.string().uuid() })
    .safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const publicationRepo = new SupabaseRefereePortalPublicationRepository();
    const registrationRepo = new SupabaseRefereeEventRegistrationRepository();
    const result = await registerForEvent(
      {
        publicationId: parsed.data.publicationId,
        refereeUserId: referee.refereeUserId,
      },
      { publicationRepo, registrationRepo },
    );
    revalidatePath(REFEREE_DASHBOARD_PATH);
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof NotAnEventError) {
      return {
        success: false,
        error: "Esta publicación no es un evento.",
        code: "NOT_AN_EVENT",
      };
    }
    if (err instanceof AlreadyRegisteredForEventError) {
      return {
        success: false,
        error: "Ya estás inscrito en este evento.",
        code: "ALREADY_REGISTERED",
      };
    }
    if (err instanceof EventAtCapacityError) {
      return {
        success: false,
        error: "El evento ha alcanzado el cupo máximo.",
        code: "AT_CAPACITY",
      };
    }
    if (err instanceof RegistrationDeadlinePassedError) {
      return {
        success: false,
        error: "El plazo de inscripción ha cerrado.",
        code: "DEADLINE_PASSED",
      };
    }
    console.error("[registerForEventAction] Unexpected error:", err);
    return {
      success: false,
      error: "Ha ocurrido un error inesperado.",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Unregisters the authenticated referee from an event.
 * Validates: Requisitos 4.8, 4.9, 4.10, 7.4
 */
export async function unregisterFromEventAction(
  rawInput: unknown,
): Promise<ActionResult> {
  const referee = await requireReferee();
  if (!referee) {
    return { success: false, error: "Acceso denegado.", code: "FORBIDDEN" };
  }

  const parsed = z
    .object({ publicationId: z.string().uuid() })
    .safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const registrationRepo = new SupabaseRefereeEventRegistrationRepository();
    await unregisterFromEvent(
      {
        publicationId: parsed.data.publicationId,
        refereeUserId: referee.refereeUserId,
      },
      { registrationRepo },
    );
    revalidatePath(REFEREE_DASHBOARD_PATH);
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof RefereeEventRegistrationNotFoundError) {
      return {
        success: false,
        error: "No estás inscrito en este evento.",
        code: "NOT_FOUND",
      };
    }
    console.error("[unregisterFromEventAction] Unexpected error:", err);
    return {
      success: false,
      error: "Ha ocurrido un error inesperado.",
      code: "INTERNAL_ERROR",
    };
  }
}

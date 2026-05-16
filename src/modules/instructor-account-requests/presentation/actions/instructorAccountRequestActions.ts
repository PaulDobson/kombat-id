"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { SupabaseInstructorAccountRequestRepository } from "../../infrastructure/repositories/supabaseInstructorAccountRequestRepository";
import {
  SubmitInstructorAccountRequestInput,
  submitInstructorAccountRequest,
} from "../../application/use-cases/submitInstructorAccountRequest";
import {
  approveInstructorAccountRequest,
  type InstructorAuthService,
} from "../../application/use-cases/approveInstructorAccountRequest";
import { rejectInstructorAccountRequest } from "../../application/use-cases/rejectInstructorAccountRequest";
import {
  ObserveInstructorAccountRequestInput,
  observeInstructorAccountRequest,
} from "../../application/use-cases/observeInstructorAccountRequest";
import { listInstructorAccountRequests } from "../../application/use-cases/listInstructorAccountRequests";
import type { InstructorAccountRequestFilter } from "../../domain/interfaces/instructorAccountRequestRepository";
import type { InstructorAccountRequestStatus } from "../../domain/entities/instructorAccountRequest";
import {
  InstructorAccountRequestNotFoundError,
  DuplicateInstructorEmailError,
  InvalidInstructorStatusTransitionError,
  InstructorAuthUserCreationError,
} from "../../domain/errors";
import type { InstructorAccountRequestListItem } from "../components/instructorAccountRequestListItem";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

// ---------------------------------------------------------------------------
// Revalidation path
// ---------------------------------------------------------------------------

const ADMIN_PATH = "/admin/instructor-requests";

// ---------------------------------------------------------------------------
// Auth helper — verifies session and admin role
// Validates: Requirements 10.1, 10.2, 10.3
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// InstructorAuthService implementation (composition root)
// Creates a Supabase Auth user with role 'instructor' in app_metadata.
// Validates: Requirements 4.6, 10.4
// ---------------------------------------------------------------------------

const instructorAuthService: InstructorAuthService = {
  async inviteInstructorUser(
    email: string,
  ): Promise<{ authUserId: string; temporaryPassword: string }> {
    // Generate a secure temporary password: 16 chars, mix of letters/digits/symbols
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    const temporaryPassword = Array.from(
      { length: 16 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");

    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      app_metadata: { role: "instructor" },
    });

    if (error || !data?.user) {
      throw new Error(error?.message ?? "Unknown error creating auth user");
    }

    return { authUserId: data.user.id, temporaryPassword };
  },
};

// ---------------------------------------------------------------------------
// Public action — no authentication required
// Validates: Requirements 1.2, 1.5, 2.1, 2.2, 9.4
// ---------------------------------------------------------------------------

/**
 * Submits a new instructor account request from the public form.
 * Does not require authentication.
 * Validates: Requirements 1.2, 1.5, 1.11, 2.1, 2.2, 9.4
 */
export async function submitInstructorAccountRequestAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = SubmitInstructorAccountRequestInput.safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const repo = new SupabaseInstructorAccountRequestRepository();
    const result = await submitInstructorAccountRequest(parsed.data, { repo });
    return { success: true, data: result };
  } catch (err) {
    if (err instanceof DuplicateInstructorEmailError) {
      return {
        success: false,
        error: "Ya existe una solicitud con este email",
        code: "CONFLICT",
      };
    }
    console.error(
      "[submitInstructorAccountRequestAction] Unexpected error:",
      err,
    );
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// ---------------------------------------------------------------------------
// Admin actions — require admin session
// ---------------------------------------------------------------------------

/**
 * Approves a pending instructor account request and provisions the Auth account.
 * Validates: Requirements 4.1, 4.9, 9.1, 9.2, 10.1, 10.2, 10.3
 */
export async function approveInstructorAccountRequestAction(
  rawInput: unknown,
): Promise<ActionResult<{ temporaryPassword: string }>> {
  // Step 1 — Authentication + authorization
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  // Step 2 — Input validation
  const parsed = z.object({ requestId: z.string().uuid() }).safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const repo = new SupabaseInstructorAccountRequestRepository();
    const { temporaryPassword } = await approveInstructorAccountRequest(
      { requestId: parsed.data.requestId, adminId: admin.userId },
      { repo, authService: instructorAuthService },
    );

    // After Auth user is created, provision a practitioners record so the
    // instructor can access /instructor immediately. Fields that require
    // real data (rut, birthDate, etc.) are set to placeholder values that
    // the admin or instructor can update later.
    const request = await repo.findById(parsed.data.requestId);
    if (request?.authUserId) {
      const now = new Date().toISOString();
      const today = now.slice(0, 10);
      await adminSupabase.from("practitioners").insert({
        id: crypto.randomUUID(),
        auth_user_id: request.authUserId,
        full_name: request.fullName,
        rut: request.rut,
        birth_date: "1990-01-01", // placeholder — admin must update
        gender: "other" as const,
        grade: "black" as const,
        dan: null,
        start_date: today,
        is_active: true,
        contact_phone: request.phone,
        contact_email: request.email,
        photo_path: null,
        qr_token: crypto.randomUUID(),
        weight_kg: null,
        height_cm: null,
        deactivated_at: null,
        deactivation_reason: null,
        updated_at: now,
        created_at: now,
        role: "instructor" as const,
        address_street: null,
        address_city: null,
        address_region: null,
        instructor_id: null,
      });
    }

    // NOTE: revalidatePath is intentionally omitted here so the client
    // component can display the temporary password before the page refreshes.
    // The ApproveInstructorRequestButton shows a manual refresh button instead.
    return { success: true, data: { temporaryPassword } };
  } catch (err) {
    if (err instanceof InstructorAccountRequestNotFoundError) {
      return {
        success: false,
        error: "Solicitud no encontrada",
        code: "NOT_FOUND",
      };
    }
    if (err instanceof InvalidInstructorStatusTransitionError) {
      return {
        success: false,
        error: "La solicitud no puede ser aprobada en su estado actual",
        code: "INVALID_STATUS_TRANSITION",
      };
    }
    if (err instanceof InstructorAuthUserCreationError) {
      console.error("[approveInstructorAccountRequestAction] Auth error:", err);
      return {
        success: false,
        error: "Error al crear la cuenta del instructor",
        code: "AUTH_USER_CREATION_ERROR",
      };
    }
    console.error(
      "[approveInstructorAccountRequestAction] Unexpected error:",
      err,
    );
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Rejects a pending instructor account request.
 * Validates: Requirements 5.1, 5.8, 9.1, 9.2, 10.1, 10.2, 10.3
 */
export async function rejectInstructorAccountRequestAction(
  rawInput: unknown,
): Promise<ActionResult> {
  // Step 1 — Authentication + authorization
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  // Step 2 — Input validation
  const parsed = z.object({ requestId: z.string().uuid() }).safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const repo = new SupabaseInstructorAccountRequestRepository();
    await rejectInstructorAccountRequest(
      { requestId: parsed.data.requestId, adminId: admin.userId },
      { repo },
    );
    revalidatePath(ADMIN_PATH);
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof InstructorAccountRequestNotFoundError) {
      return {
        success: false,
        error: "Solicitud no encontrada",
        code: "NOT_FOUND",
      };
    }
    if (err instanceof InvalidInstructorStatusTransitionError) {
      return {
        success: false,
        error: "La solicitud no puede ser rechazada en su estado actual",
        code: "INVALID_STATUS_TRANSITION",
      };
    }
    console.error(
      "[rejectInstructorAccountRequestAction] Unexpected error:",
      err,
    );
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Records an observation note on an instructor account request.
 * Validates: Requirements 6.3, 6.7, 9.1, 9.2, 10.1, 10.2, 10.3
 */
export async function observeInstructorAccountRequestAction(
  rawInput: unknown,
): Promise<ActionResult> {
  // Step 1 — Authentication + authorization
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  // Step 2 — Input validation
  const parsed = ObserveInstructorAccountRequestInput.omit({
    adminId: true,
  }).safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const repo = new SupabaseInstructorAccountRequestRepository();
    await observeInstructorAccountRequest(
      {
        requestId: parsed.data.requestId,
        adminId: admin.userId,
        observationNotes: parsed.data.observationNotes,
      },
      { repo },
    );
    revalidatePath(ADMIN_PATH);
    return { success: true, data: undefined };
  } catch (err) {
    if (err instanceof InstructorAccountRequestNotFoundError) {
      return {
        success: false,
        error: "Solicitud no encontrada",
        code: "NOT_FOUND",
      };
    }
    console.error(
      "[observeInstructorAccountRequestAction] Unexpected error:",
      err,
    );
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

// ---------------------------------------------------------------------------
// List action — admin only
// Validates: Requirements 3.2, 3.6, 9.1, 9.2, 10.1, 10.2, 10.3, 10.6
// ---------------------------------------------------------------------------

const ListInstructorAccountRequestsInput = z.object({
  status: z.enum(["pending", "approved", "rejected", "observed"]).optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(25).optional(),
});

/**
 * Lists instructor account requests for the admin dashboard.
 * Maps domain entities to InstructorAccountRequestListItem (excludes sensitive fields).
 * Validates: Requirements 3.2, 3.6, 9.1, 9.2, 10.1, 10.2, 10.3, 10.6
 */
export async function listInstructorAccountRequestsAction(
  rawInput: unknown,
): Promise<
  ActionResult<{ items: InstructorAccountRequestListItem[]; total: number }>
> {
  // Step 1 — Authentication + authorization
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, error: "No autorizado", code: "FORBIDDEN" };
  }

  // Step 2 — Input validation
  const parsed = ListInstructorAccountRequestsInput.safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const repo = new SupabaseInstructorAccountRequestRepository();
    const filter: InstructorAccountRequestFilter = {
      ...(parsed.data.status !== undefined && {
        status: parsed.data.status as InstructorAccountRequestStatus,
      }),
      ...(parsed.data.page !== undefined && { page: parsed.data.page }),
      ...(parsed.data.pageSize !== undefined && {
        pageSize: parsed.data.pageSize,
      }),
    };

    const { items, total } = await listInstructorAccountRequests(filter, {
      repo,
    });

    // Map to list DTO — excludes authUserId, approvedBy, rejectedBy, observedBy
    // to comply with Requirement 10.6 (no sensitive fields in client responses)
    const listItems: InstructorAccountRequestListItem[] = items.map((item) => ({
      id: item.id,
      email: item.email,
      fullName: item.fullName,
      rut: item.rut,
      phone: item.phone,
      academyName: item.academyName,
      message: item.message,
      status: item.status,
      observationNotes: item.observationNotes,
      createdAt: item.createdAt,
    }));

    return { success: true, data: { items: listItems, total } };
  } catch (err) {
    console.error(
      "[listInstructorAccountRequestsAction] Unexpected error:",
      err,
    );
    return {
      success: false,
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  }
}

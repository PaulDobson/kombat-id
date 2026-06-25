import { z } from "zod";
import { isValidStatusTransition } from "../../domain/entities/refereeRegistration";
import type { RefereeRegistrationRepository } from "../../domain/interfaces/refereeRegistrationRepository";
import {
  AuthUserCreationError,
  InvalidStatusTransitionError,
  RefereeRegistrationNotFoundError,
} from "../../domain/errors";

// ---------------------------------------------------------------------------
// Auth service interface — injected as dependency (DIP)
// ---------------------------------------------------------------------------

export interface RefereeAuthService {
  /**
   * Crea un usuario Supabase Auth con rol 'referee' en app_metadata
   * y una contraseña temporal. Retorna el auth user id y la contraseña
   * temporal para enviarla en el email de bienvenida.
   * Si el usuario ya existe, asigna el rol si falta y retorna el id existente
   * (sin temporaryPassword).
   */
  inviteRefereeUser(
    email: string,
  ): Promise<{ authUserId: string; temporaryPassword?: string }>;
}

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const ApproveRefereeRegistrationInput = z.object({
  id: z.string().uuid("El id del registro debe ser un UUID válido"),
  adminId: z.string().uuid("El id del administrador debe ser un UUID válido"),
});

export type ApproveRefereeRegistrationInput = z.infer<
  typeof ApproveRefereeRegistrationInput
>;

// ---------------------------------------------------------------------------
// Use case
// ---------------------------------------------------------------------------

/**
 * Approves a pending referee registration.
 *
 * Invariant: if Auth user creation fails, the registration status is NOT changed.
 *
 * Validates:
 *   - Propiedad 3: Transición de estado válida
 *   - Propiedad 4: Consistencia aprobación–cuenta Auth
 *   - Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
export async function approveRefereeRegistration(
  input: ApproveRefereeRegistrationInput,
  deps: {
    repo: RefereeRegistrationRepository;
    authService: RefereeAuthService;
  },
): Promise<{ temporaryPassword?: string }> {
  const { repo, authService } = deps;

  const registration = await repo.findById(input.id);
  if (!registration) {
    throw new RefereeRegistrationNotFoundError(input.id);
  }

  if (!isValidStatusTransition(registration.status, "approved")) {
    throw new InvalidStatusTransitionError(registration.status, "approved");
  }

  // Crear cuenta Auth ANTES de actualizar el estado del registro.
  // Si falla, el registro permanece en 'pending' (invariante preservado).
  let authUserId: string;
  let temporaryPassword: string | undefined;
  try {
    const result = await authService.inviteRefereeUser(registration.email);
    authUserId = result.authUserId;
    temporaryPassword = result.temporaryPassword;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new AuthUserCreationError(registration.email, reason);
  }

  const now = new Date().toISOString();
  await repo.updateStatus(input.id, "approved", {
    adminId: input.adminId,
    authUserId,
    timestamp: now,
  });

  return temporaryPassword ? { temporaryPassword } : {};
}

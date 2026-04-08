import { z } from "zod";
import { validateRoleForGrade } from "../../domain/entities/practitioner";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import type { AuditLogRepository } from "../../domain/interfaces/auditLogRepository";
import {
  PractitionerNotFoundError,
  PractitionerInactiveError,
} from "../../domain/errors";
import { DomainError } from "@/lib/errors";

export const UpdatePractitionerRoleInput = z.object({
  publicId: z.string().uuid(),
  newRole: z.enum(["alumno", "instructor", "profesor", "maestro"]),
  adminId: z.string().uuid(),
});

export type UpdatePractitionerRoleInput = z.infer<
  typeof UpdatePractitionerRoleInput
>;

/**
 * Req 9.1, 9.8, 9.9, 9.10 — Actualiza el rol jerárquico de un practicante.
 *
 * Valida que el nuevo rol sea compatible con el grado y dan del practicante
 * antes de persistir el cambio y registrar el evento en el audit log.
 */
export async function updatePractitionerRole(
  input: UpdatePractitionerRoleInput,
  deps: {
    practitionerRepo: PractitionerRepository;
    auditLogRepo: AuditLogRepository;
  },
): Promise<void> {
  UpdatePractitionerRoleInput.parse(input);

  const practitioner = await deps.practitionerRepo.findById(input.publicId);
  if (!practitioner) {
    throw new PractitionerNotFoundError(input.publicId);
  }

  if (!practitioner.isActive) {
    throw new PractitionerInactiveError(input.publicId);
  }

  const isValid = validateRoleForGrade(
    input.newRole,
    practitioner.grade,
    practitioner.dan,
  );

  if (!isValid) {
    throw new DomainError(
      `Role "${input.newRole}" is not compatible with grade "${practitioner.grade}"` +
        (practitioner.dan !== null ? ` and dan ${practitioner.dan}` : ""),
    );
  }

  const previousRole = practitioner.role ?? null;

  await deps.practitionerRepo.save({
    ...practitioner,
    role: input.newRole,
  });

  await deps.auditLogRepo.log({
    adminId: input.adminId,
    action: "update_role",
    targetType: "practitioner",
    targetId: input.publicId,
    metadata: { previousRole, newRole: input.newRole },
  });
}

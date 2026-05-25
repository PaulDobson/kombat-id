import { z } from "zod";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import {
  PractitionerNotFoundError,
  UnauthorizedError,
} from "../../domain/errors";

/**
 * Schema de validación para la entrada del caso de uso
 */
export const DeletePractitionerByInstructorInputSchema = z.object({
  practitionerId: z.string().uuid(),
  instructorId: z.string().uuid(),
  academyId: z.string().uuid(),
});

export type DeletePractitionerByInstructorInput = z.infer<
  typeof DeletePractitionerByInstructorInputSchema
>;

/**
 * Caso de uso: Eliminar un practicante registrado por un instructor
 *
 * Reglas de negocio:
 * - Solo puede eliminar practicantes que el instructor registró (instructor_id match)
 * - El practicante debe pertenecer a una academia del instructor
 * - Soft delete: mantiene historial, certificaciones, eventos, etc.
 * - Hard delete: elimina físicamente el usuario de auth.users
 * - Desactiva membresías, certificaciones y grados de disciplinas
 */
export async function deletePractitionerByInstructor(
  input: DeletePractitionerByInstructorInput,
  deps: {
    practitionerRepo: PractitionerRepository;
    verifyInstructorOwnership: (
      practitionerId: string,
      instructorId: string,
    ) => Promise<boolean>;
    verifyAcademyMembership: (
      practitionerId: string,
      instructorId: string,
    ) => Promise<boolean>;
    softDeletePractitioner: (
      practitionerId: string,
      reason: string,
    ) => Promise<void>;
    deleteAuthUser: (authUserId: string) => Promise<void>;
  },
): Promise<void> {
  // Validar entrada
  DeletePractitionerByInstructorInputSchema.parse(input);

  // 1. Verificar que el practicante existe
  const practitioner = await deps.practitionerRepo.findById(
    input.practitionerId,
  );
  if (!practitioner) {
    throw new PractitionerNotFoundError(input.practitionerId);
  }

  // 2. Verificar que el instructor registró al practicante
  const isOwner = await deps.verifyInstructorOwnership(
    input.practitionerId,
    input.instructorId,
  );
  if (!isOwner) {
    throw new UnauthorizedError(
      "Solo puedes eliminar alumnos que tú registraste",
    );
  }

  // 3. Verificar que el practicante pertenece a una academia del instructor
  const belongsToAcademy = await deps.verifyAcademyMembership(
    input.practitionerId,
    input.instructorId,
  );
  if (!belongsToAcademy) {
    throw new UnauthorizedError(
      "El alumno no pertenece a una de tus academias",
    );
  }

  // 4. Soft delete: desactivar el practicante y todas sus relaciones
  const reason = `Eliminado por instructor: ${input.instructorId}`;
  await deps.softDeletePractitioner(input.practitionerId, reason);

  // 5. Hard delete: eliminar físicamente el usuario de auth.users
  if (practitioner.authUserId) {
    await deps.deleteAuthUser(practitioner.authUserId);
  }
}

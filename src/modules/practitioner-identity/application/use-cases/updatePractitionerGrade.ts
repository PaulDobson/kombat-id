import { z } from "zod";
import type { Grade } from "../../domain/entities/practitioner";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import type { MartialHistoryRepository } from "../../domain/interfaces/martialHistoryRepository";
import type { AuditLogRepository } from "../../domain/interfaces/auditLogRepository";
import {
  PractitionerNotFoundError,
  UnauthorizedError,
  InvalidGradeDowngradeError,
} from "../../domain/errors";

const GRADE_RANK: Record<Grade, number> = {
  white: 0,
  yellow: 1,
  green: 2,
  blue: 3,
  red: 4,
  black: 5,
};

export const UpdatePractitionerGradeInputSchema = z.object({
  publicId: z.string().uuid(),
  newGrade: z.enum(["white", "yellow", "green", "blue", "red", "black"]),
  adminId: z.string().uuid(),
  justification: z.string().optional(),
});

export type UpdatePractitionerGradeInput = z.infer<
  typeof UpdatePractitionerGradeInputSchema
>;

export async function updatePractitionerGrade(
  input: UpdatePractitionerGradeInput,
  deps: {
    practitionerRepo: PractitionerRepository;
    martialHistoryRepo: MartialHistoryRepository;
    auditLogRepo: AuditLogRepository;
    isAdmin: (userId: string) => Promise<boolean>;
  },
): Promise<void> {
  UpdatePractitionerGradeInputSchema.parse(input);

  const adminAllowed = await deps.isAdmin(input.adminId);
  if (!adminAllowed) {
    throw new UnauthorizedError(
      "Only administrators can update a practitioner's grade",
    );
  }

  const practitioner = await deps.practitionerRepo.findById(input.publicId);
  if (!practitioner) {
    throw new PractitionerNotFoundError(input.publicId);
  }

  const isDowngrade =
    GRADE_RANK[input.newGrade] < GRADE_RANK[practitioner.grade];

  if (
    isDowngrade &&
    (!input.justification || input.justification.trim() === "")
  ) {
    throw new InvalidGradeDowngradeError();
  }

  await deps.practitionerRepo.updateGrade(
    input.publicId,
    input.newGrade,
    input.adminId,
  );

  await deps.martialHistoryRepo.addEntry({
    practitionerId: input.publicId,
    eventId: null,
    eventType: "exam",
    eventDate: new Date().toISOString().split("T")[0],
    result: input.newGrade,
    notes: input.justification ?? null,
    recordedBy: input.adminId,
  });

  await deps.auditLogRepo.log({
    adminId: input.adminId,
    action: "UPDATE_GRADE",
    targetType: "practitioner",
    targetId: input.publicId,
    metadata: {
      oldGrade: practitioner.grade,
      newGrade: input.newGrade,
    },
  });
}

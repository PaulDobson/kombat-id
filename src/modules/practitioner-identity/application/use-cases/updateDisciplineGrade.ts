import { z } from "zod";
import type { Grade } from "../../domain/entities/practitioner";
import type { DisciplineGrade } from "../../domain/entities/disciplineGrade";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import type { DisciplineGradeRepository } from "../../domain/interfaces/disciplineGradeRepository";
import type { MartialHistoryRepository } from "../../domain/interfaces/martialHistoryRepository";
import {
  PractitionerNotFoundError,
  PractitionerInactiveError,
  UnauthorizedError,
} from "../../domain/errors";

export const UpdateDisciplineGradeInputSchema = z.object({
  practitionerId: z.string().uuid(),
  discipline: z.enum([
    "kombat_taekwondo",
    "taekwondo_wtf",
    "hapkido",
    "kick_boxing",
    "defensa_personal",
  ]),
  grade: z.enum(["white", "yellow", "green", "blue", "red", "black"]),
  dan: z.number().int().min(1).optional().nullable(),
  obtainedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adminId: z.string().uuid(),
  certifyingMasterId: z.string().uuid().optional().nullable(),
  certificationId: z.string().uuid().optional().nullable(),
});

export type UpdateDisciplineGradeInput = z.infer<
  typeof UpdateDisciplineGradeInputSchema
>;

export interface UpdateDisciplineGradeResult {
  disciplineGradeId: string;
}

const DISCIPLINE_LABELS: Record<string, string> = {
  kombat_taekwondo: "Kombat Taekwondo",
  taekwondo_wtf: "Taekwondo WTF",
  hapkido: "Hapkido",
  kick_boxing: "Kick Boxing",
  defensa_personal: "Defensa Personal",
};

export async function updateDisciplineGrade(
  input: UpdateDisciplineGradeInput,
  deps: {
    practitionerRepo: PractitionerRepository;
    disciplineGradeRepo: DisciplineGradeRepository;
    martialHistoryRepo: MartialHistoryRepository;
    isAdmin: (userId: string) => Promise<boolean>;
  },
): Promise<UpdateDisciplineGradeResult> {
  UpdateDisciplineGradeInputSchema.parse(input);

  // Req 13.4 — Verify admin role
  const adminAllowed = await deps.isAdmin(input.adminId);
  if (!adminAllowed) {
    throw new UnauthorizedError(
      "Only administrators can update a practitioner's discipline grade",
    );
  }

  // Verify practitioner exists and is active
  const practitioner = await deps.practitionerRepo.findById(
    input.practitionerId,
  );
  if (!practitioner) {
    throw new PractitionerNotFoundError(input.practitionerId);
  }
  if (!practitioner.isActive) {
    throw new PractitionerInactiveError(input.practitionerId);
  }

  // Req 13.3 — Find and deactivate current active grade for this discipline
  const currentActive =
    await deps.disciplineGradeRepo.findActiveByPractitionerAndDiscipline(
      input.practitionerId,
      input.discipline,
    );
  if (currentActive) {
    await deps.disciplineGradeRepo.deactivate(currentActive.id);
  }

  // Create new DisciplineGrade
  const now = new Date().toISOString();
  const newDisciplineGrade: DisciplineGrade = {
    id: crypto.randomUUID(),
    practitionerId: input.practitionerId,
    discipline: input.discipline,
    grade: input.grade as Grade,
    dan: input.dan ?? null,
    isActive: true,
    obtainedAt: input.obtainedAt,
    certifyingMasterId: input.certifyingMasterId ?? null,
    certificationId: input.certificationId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await deps.disciplineGradeRepo.save(newDisciplineGrade);

  // Req 13.4 — Register in martial history with discipline info
  const disciplineLabel =
    DISCIPLINE_LABELS[input.discipline] ?? input.discipline;
  await deps.martialHistoryRepo.addEntry({
    practitionerId: input.practitionerId,
    eventId: null,
    eventType: "exam",
    eventDate: input.obtainedAt,
    result: input.grade,
    notes: `Actualización de grado en disciplina: ${disciplineLabel}`,
    recordedBy: input.adminId,
    eventScope: null,
    eventCountry: null,
  });

  // Req 13.9 — Sync practitioners.grade if discipline is kombat_taekwondo
  if (input.discipline === "kombat_taekwondo") {
    await deps.practitionerRepo.updateGrade(
      input.practitionerId,
      input.grade as Grade,
      input.adminId,
    );
  }

  return { disciplineGradeId: newDisciplineGrade.id };
}

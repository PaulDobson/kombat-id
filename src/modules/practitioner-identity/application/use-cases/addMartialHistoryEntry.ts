import { z } from "zod";
import type { MartialHistoryEntry } from "../../domain/entities/martialHistoryEntry";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import type {
  MartialHistoryRepository,
  NewMartialHistoryEntry,
} from "../../domain/interfaces/martialHistoryRepository";
import {
  PractitionerNotFoundError,
  DuplicateHistoryEntryError,
} from "../../domain/errors";

export const AddMartialHistoryEntryInputSchema = z
  .object({
    practitionerId: z.string().uuid(),
    eventId: z.string().uuid().optional().nullable(),
    eventType: z.enum(["competition", "seminar", "exam"]),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    result: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    recordedBy: z.string().uuid(),
    eventScope: z.enum(["national", "international"]).optional().nullable(),
    eventCountry: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.eventScope === "international" && !data.eventCountry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "eventCountry es obligatorio cuando eventScope es 'international'",
        path: ["eventCountry"],
      });
    }
  });

export type AddMartialHistoryEntryInput = z.infer<
  typeof AddMartialHistoryEntryInputSchema
>;

export async function addMartialHistoryEntry(
  input: AddMartialHistoryEntryInput,
  deps: {
    practitionerRepo: PractitionerRepository;
    martialHistoryRepo: MartialHistoryRepository;
  },
): Promise<MartialHistoryEntry> {
  AddMartialHistoryEntryInputSchema.parse(input);

  const practitioner = await deps.practitionerRepo.findById(
    input.practitionerId,
  );
  if (!practitioner) {
    throw new PractitionerNotFoundError(input.practitionerId);
  }

  if (input.eventId != null) {
    const isDuplicate = await deps.martialHistoryRepo.existsForEvent(
      input.practitionerId,
      input.eventId,
    );
    if (isDuplicate) {
      throw new DuplicateHistoryEntryError(input.practitionerId, input.eventId);
    }
  }

  const entry: NewMartialHistoryEntry = {
    practitionerId: input.practitionerId,
    eventId: input.eventId ?? null,
    eventType: input.eventType,
    eventDate: input.eventDate,
    result: input.result ?? null,
    notes: input.notes ?? null,
    recordedBy: input.recordedBy,
    eventScope: input.eventScope ?? null,
    eventCountry: input.eventCountry ?? null,
  };

  return deps.martialHistoryRepo.addEntry(entry);
}

import { z } from "zod";
import type { RefereePortalPublicationRepository } from "../../domain/interfaces/refereePortalPublicationRepository";
import { PortalPublicationNotFoundError } from "../../domain/errors";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const UpdatePortalPublicationInput = z.object({
  id: z.string().uuid("El id de la publicación debe ser un UUID válido"),
  title: z
    .string()
    .min(1, "El título es obligatorio")
    .max(300, "El título no puede superar los 300 caracteres"),
  body: z.string().min(1, "El contenido es obligatorio"),
  category: z.enum(["news", "regulation", "championship"], {
    error: "La categoría debe ser news, regulation o championship",
  }),
  // New optional fields
  coverImagePath: z.string().nullable().optional(),
  isEvent: z.boolean().optional().default(false),
  eventDate: z.string().nullable().optional(),
  eventLocation: z.string().nullable().optional(),
  maxParticipants: z
    .number()
    .int()
    .positive("El cupo máximo debe ser un entero positivo")
    .nullable()
    .optional(),
  registrationDeadline: z.string().nullable().optional(),
});

export type UpdatePortalPublicationInput = z.infer<
  typeof UpdatePortalPublicationInput
>;

// ---------------------------------------------------------------------------
// Use case
// ---------------------------------------------------------------------------

/**
 * Updates an existing portal publication.
 * Validates: Requisito 8.4
 *
 * Domain rule: if isEvent === false OR category !== "championship",
 * all event fields are forced to null before persisting.
 */
export async function updatePortalPublication(
  input: UpdatePortalPublicationInput,
  deps: { repo: RefereePortalPublicationRepository },
): Promise<void> {
  const { repo } = deps;

  const publication = await repo.findById(input.id);
  if (!publication) {
    throw new PortalPublicationNotFoundError(input.id);
  }

  const now = new Date().toISOString();

  // Apply domain rule: event fields are only valid when isEvent === true AND category === "championship"
  const isEvent =
    input.isEvent === true && input.category === "championship" ? true : false;

  const eventDate = isEvent ? (input.eventDate ?? null) : null;
  const eventLocation = isEvent ? (input.eventLocation ?? null) : null;
  const maxParticipants = isEvent ? (input.maxParticipants ?? null) : null;
  const registrationDeadline = isEvent
    ? (input.registrationDeadline ?? null)
    : null;

  await repo.save({
    ...publication,
    title: input.title,
    body: input.body,
    category: input.category,
    updatedAt: now,
    // coverImagePath: if provided in input, use it; otherwise keep existing
    coverImagePath:
      input.coverImagePath !== undefined
        ? input.coverImagePath
        : publication.coverImagePath,
    isEvent,
    eventDate,
    eventLocation,
    maxParticipants,
    registrationDeadline,
  });
}

import { z } from "zod";
import { randomUUID } from "crypto";
import type { RefereePortalPublicationRepository } from "../../domain/interfaces/refereePortalPublicationRepository";

// ---------------------------------------------------------------------------
// Input schema
// Validates: Propiedad 11 — Consistencia de categorías de publicaciones
// ---------------------------------------------------------------------------

export const CreatePortalPublicationInput = z.object({
  title: z
    .string()
    .min(1, "El título es obligatorio")
    .max(300, "El título no puede superar los 300 caracteres"),
  body: z.string().min(1, "El contenido es obligatorio"),
  category: z.enum(["news", "regulation", "championship"], {
    error: "La categoría debe ser news, regulation o championship",
  }),
  createdBy: z.string().uuid("El id del creador debe ser un UUID válido"),
  publishedAt: z.string().optional(),
  // Optional pre-generated ID (used when the caller needs the ID before calling the use case, e.g. for image upload)
  id: z.string().uuid().optional(),
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

export type CreatePortalPublicationInput = z.infer<
  typeof CreatePortalPublicationInput
>;

// ---------------------------------------------------------------------------
// Use case
// ---------------------------------------------------------------------------

/**
 * Creates a new portal publication.
 * Validates: Requisitos 8.1, 8.2, 8.3
 *
 * Domain rule: if isEvent === false OR category !== "championship",
 * all event fields are forced to null before persisting.
 */
export async function createPortalPublication(
  input: CreatePortalPublicationInput,
  deps: { repo: RefereePortalPublicationRepository },
): Promise<{ id: string }> {
  const now = new Date().toISOString();
  // Use caller-supplied ID if provided (e.g. when image was uploaded before calling this use case)
  const id = input.id ?? randomUUID();

  // Apply domain rule: event fields are only valid when isEvent === true AND category === "championship"
  const isEvent =
    input.isEvent === true && input.category === "championship" ? true : false;

  const eventDate = isEvent ? (input.eventDate ?? null) : null;
  const eventLocation = isEvent ? (input.eventLocation ?? null) : null;
  const maxParticipants = isEvent ? (input.maxParticipants ?? null) : null;
  const registrationDeadline = isEvent
    ? (input.registrationDeadline ?? null)
    : null;

  await deps.repo.save({
    id,
    title: input.title,
    body: input.body,
    category: input.category,
    publishedAt: input.publishedAt ?? now,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
    coverImagePath: input.coverImagePath ?? null,
    isEvent,
    eventDate,
    eventLocation,
    maxParticipants,
    registrationDeadline,
  });

  return { id };
}

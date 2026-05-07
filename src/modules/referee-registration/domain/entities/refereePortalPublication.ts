// Domain entity — zero framework imports

export type PublicationCategory = "news" | "regulation" | "championship";

export interface RefereePortalPublication {
  id: string; // UUID
  title: string;
  body: string;
  category: PublicationCategory;
  publishedAt: string; // ISO timestamp
  createdBy: string; // UUID of the admin who created it
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp

  /**
   * Path in Supabase Storage (referee-portal-images bucket).
   * Independent of category — any publication can have a cover image.
   * Example: "{publicationId}/cover.jpg"
   */
  coverImagePath: string | null;

  /**
   * Indicates whether this publication is a registerable event.
   *
   * Domain rule: `isEvent` can only be `true` when `category === "championship"`.
   * If `category !== "championship"`, this field must be `false`.
   */
  isEvent: boolean;

  /**
   * ISO date string (YYYY-MM-DD) for the event date.
   *
   * Domain rule: must be `null` when `isEvent === false`.
   */
  eventDate: string | null;

  /**
   * Free-text location of the event, e.g. "Gimnasio Nacional, Santiago".
   *
   * Domain rule: must be `null` when `isEvent === false`.
   */
  eventLocation: string | null;

  /**
   * Maximum number of participants allowed for the event.
   * `null` means no limit.
   *
   * Domain rule: must be `null` when `isEvent === false`.
   */
  maxParticipants: number | null;

  /**
   * ISO date string (YYYY-MM-DD) after which registrations are no longer accepted.
   *
   * Domain rule: must be `null` when `isEvent === false`.
   */
  registrationDeadline: string | null;
}

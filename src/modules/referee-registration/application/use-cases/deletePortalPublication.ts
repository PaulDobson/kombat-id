import type { RefereePortalPublicationRepository } from "../../domain/interfaces/refereePortalPublicationRepository";
import { PortalPublicationNotFoundError } from "../../domain/errors";

/**
 * Deletes a portal publication.
 * Throws PortalPublicationNotFoundError if the publication does not exist.
 *
 * If the publication has a coverImagePath and a storageService is provided,
 * attempts to delete the file from Storage before deleting the DB record.
 * If Storage deletion fails, logs the error and continues with DB deletion.
 *
 * Validates: Requisito 8.5, 1.9, 1.10
 */
export async function deletePortalPublication(
  id: string,
  deps: {
    repo: RefereePortalPublicationRepository;
    storageService?: { deleteFile(path: string): Promise<void> };
  },
): Promise<void> {
  const { repo, storageService } = deps;

  const publication = await repo.findById(id);
  if (!publication) {
    throw new PortalPublicationNotFoundError(id);
  }

  // Attempt to delete cover image from Storage if it exists
  if (publication.coverImagePath !== null && storageService) {
    try {
      await storageService.deleteFile(publication.coverImagePath);
    } catch (err) {
      console.error(
        `[deletePortalPublication] Failed to delete cover image from Storage for publication "${id}" at path "${publication.coverImagePath}":`,
        err,
      );
      // Continue with DB deletion regardless of Storage failure
    }
  }

  await repo.delete(id);
}

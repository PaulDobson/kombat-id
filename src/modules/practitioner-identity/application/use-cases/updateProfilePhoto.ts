import { z } from "zod";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import {
  PractitionerNotFoundError,
  PractitionerInactiveError,
} from "../../domain/errors";

export interface StoragePort {
  upload(path: string, file: Blob, mimeType: string): Promise<string>; // returns the stored path
}

export const UpdateProfilePhotoInputSchema = z.object({
  publicId: z.string().uuid(),
  file: z.instanceof(Blob),
  mimeType: z.enum(["image/jpeg", "image/png"]),
  fileSizeBytes: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024),
});

export type UpdateProfilePhotoInput = z.infer<
  typeof UpdateProfilePhotoInputSchema
>;

export async function updateProfilePhoto(
  input: UpdateProfilePhotoInput,
  deps: { practitionerRepo: PractitionerRepository; storage: StoragePort },
): Promise<void> {
  UpdateProfilePhotoInputSchema.parse(input);

  const practitioner = await deps.practitionerRepo.findById(input.publicId);
  if (!practitioner) {
    throw new PractitionerNotFoundError(input.publicId);
  }

  if (!practitioner.isActive) {
    throw new PractitionerInactiveError(input.publicId);
  }

  const ext = input.mimeType === "image/jpeg" ? "jpg" : "png";
  const storagePath = `${input.publicId}/${Date.now()}.${ext}`;

  const storedPath = await deps.storage.upload(
    storagePath,
    input.file,
    input.mimeType,
  );

  const updatedPractitioner = {
    ...practitioner,
    photoPath: storedPath,
    updatedAt: new Date().toISOString(),
  };

  await deps.practitionerRepo.save(updatedPractitioner);
}

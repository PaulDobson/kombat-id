import { z } from "zod";
import type { MasterLineageEntry } from "../../domain/entities/masterLineage";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import type { MasterLineageRepository } from "../../domain/interfaces/masterLineageRepository";
import { PractitionerNotFoundError } from "../../domain/errors";

/** Req 9.6 — Obtener la línea de maestros certificadores de un practicante */
export const GetMasterLineageInput = z.object({
  practitionerId: z.string().uuid(),
});

export type GetMasterLineageInput = z.infer<typeof GetMasterLineageInput>;

export async function getMasterLineage(
  input: GetMasterLineageInput,
  deps: {
    practitionerRepo: PractitionerRepository;
    masterLineageRepo: MasterLineageRepository;
  },
): Promise<MasterLineageEntry[]> {
  const parsed = GetMasterLineageInput.parse(input);

  const practitioner = await deps.practitionerRepo.findById(
    parsed.practitionerId,
  );
  if (!practitioner) {
    throw new PractitionerNotFoundError(parsed.practitionerId);
  }

  const entries = await deps.masterLineageRepo.findByPractitionerId(
    parsed.practitionerId,
  );

  return entries.sort(
    (a, b) =>
      new Date(a.certifiedAt).getTime() - new Date(b.certifiedAt).getTime(),
  );
}

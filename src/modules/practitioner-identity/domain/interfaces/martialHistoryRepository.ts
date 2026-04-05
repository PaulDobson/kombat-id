import type { MartialHistoryEntry } from "../entities/martialHistoryEntry";

export type NewMartialHistoryEntry = Omit<
  MartialHistoryEntry,
  | "id"
  | "createdAt"
  | "isCorrected"
  | "correctionNote"
  | "correctedAt"
  | "correctedBy"
>;

export interface MartialHistoryRepository {
  findByPractitionerId(publicId: string): Promise<MartialHistoryEntry[]>;
  addEntry(entry: NewMartialHistoryEntry): Promise<MartialHistoryEntry>;
  markCorrected(
    entryId: string,
    justification: string,
    adminId: string,
  ): Promise<void>;
  existsForEvent(practitionerId: string, eventId: string): Promise<boolean>;
}

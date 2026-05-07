import type { RefereePortalPublication } from "../entities/refereePortalPublication";

export interface RefereePortalPublicationRepository {
  findById(id: string): Promise<RefereePortalPublication | null>;
  list(): Promise<RefereePortalPublication[]>;
  /** Returns only publications where `isEvent === true`. */
  listEvents(): Promise<RefereePortalPublication[]>;
  save(publication: RefereePortalPublication): Promise<void>;
  delete(id: string): Promise<void>;
}

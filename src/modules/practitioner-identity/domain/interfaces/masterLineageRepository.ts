import type {
  MasterLineageEntry,
  NewMasterLineageEntry,
} from "../entities/masterLineage";

/** Req 9.4, 9.6 — Contrato de acceso a datos para la línea de maestros certificadores */
export interface MasterLineageRepository {
  findByPractitionerId(practitionerId: string): Promise<MasterLineageEntry[]>;
  addEntry(entry: NewMasterLineageEntry): Promise<MasterLineageEntry>;
}

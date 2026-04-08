import type { Grade } from "./practitioner";

/** Req 9.4, 9.6 — Registro de la línea de maestros certificadores de un practicante */
export interface MasterLineageEntry {
  id: string; // UUID
  practitionerId: string; // UUID del practicante certificado
  certifyingMasterId: string; // UUID del maestro/profesor que certifica
  grade: Grade; // grado que se certifica en esta entrada
  dan: number | null; // dan del grado certificado (solo para black)
  certificationId: string; // UUID de la certificación asociada
  certifiedAt: string; // ISO date string de cuando se otorgó el grado
  createdAt: string; // ISO date string de creación del registro
}

/** Tipo para crear una nueva entrada (sin id ni createdAt, generados por el sistema) */
export type NewMasterLineageEntry = Omit<
  MasterLineageEntry,
  "id" | "createdAt"
>;

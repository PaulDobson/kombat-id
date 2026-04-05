/** Req 10.1 — Regiones de Chile */
export type ChileanRegion =
  | "arica_y_parinacota"
  | "tarapaca"
  | "antofagasta"
  | "atacama"
  | "coquimbo"
  | "valparaiso"
  | "metropolitana"
  | "ohiggins"
  | "maule"
  | "nuble"
  | "biobio"
  | "araucania"
  | "los_rios"
  | "los_lagos"
  | "aysen"
  | "magallanes";

/** Req 10.1 — Academia oficial de Kombat Taekwondo */
export interface Academy {
  id: string; // UUID único e inmutable
  name: string; // Nombre oficial
  region: ChileanRegion;
  city: string;
  address: string | null;
  foundedDate: string | null; // ISO date string (YYYY-MM-DD)
  isActive: boolean;
  deactivatedAt: string | null;
  deactivationReason: string | null;
  /** Req 10.3 — IDs de instructores responsables (rol instructor/profesor/maestro) */
  responsibleInstructorIds: string[];
  createdBy: string; // admin user id
  updatedAt: string;
  createdAt: string;
}

/** Req 10.4, 10.5 — Membresía de un practicante a una academia */
export interface AcademyMembership {
  id: string;
  academyId: string;
  practitionerId: string;
  joinedAt: string; // ISO date string (YYYY-MM-DD)
  leftAt: string | null; // null = membresía activa
  isActive: boolean;
  createdAt: string;
}

import type { Academy, ChileanRegion } from "../entities/academy";

export interface AcademySearchQuery {
  name?: string;
  region?: ChileanRegion;
  city?: string;
}

export interface AcademyRepository {
  findById(academyId: string): Promise<Academy | null>;
  findAllActive(): Promise<Academy[]>;
  search(query: AcademySearchQuery): Promise<Academy[]>;
  save(academy: Academy): Promise<void>;
  setActiveStatus(
    academyId: string,
    active: boolean,
    reason: string,
    adminId: string,
  ): Promise<void>;
  /** Req 10.10 — Conteo de practicantes activos en la academia */
  countActivePractitioners(academyId: string): Promise<number>;
}

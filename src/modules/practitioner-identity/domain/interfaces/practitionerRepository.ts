import type { Grade, Practitioner } from "../entities/practitioner";

export interface PractitionerSearchQuery {
  name?: string;
  rut?: string;
  grade?: Grade;
}

export interface PractitionerRepository {
  findById(publicId: string): Promise<Practitioner | null>;
  findByRut(rut: string): Promise<Practitioner | null>;
  findByAuthUserId(authUserId: string): Promise<Practitioner | null>;
  findByQrToken(token: string): Promise<Practitioner | null>;
  search(query: PractitionerSearchQuery): Promise<Practitioner[]>;
  /** Returns all active practitioners with the given grade (Requirements: 4.1, 11.2) */
  findActiveByGrade(grade: Grade): Promise<Practitioner[]>;
  save(practitioner: Practitioner): Promise<void>;
  updateGrade(publicId: string, grade: Grade, adminId: string): Promise<void>;
  setActiveStatus(
    publicId: string,
    active: boolean,
    reason: string,
    adminId: string,
  ): Promise<void>;
  regenerateQrToken(publicId: string, adminId: string): Promise<string>;
}

import type { Certification } from "../entities/certification";

export interface CertificationRepository {
  findById(certId: string): Promise<Certification | null>;
  findByPractitioner(publicId: string): Promise<Certification[]>;
  save(cert: Certification): Promise<void>;
  revoke(certId: string, reason: string, adminId: string): Promise<void>;
}

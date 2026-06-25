import { adminSupabase } from "@/lib/supabase/admin";
import { DrizzleAcademyRepository } from "../../infrastructure/repositories/drizzleAcademyRepository";
import { DrizzleAcademyMembershipRepository } from "../../infrastructure/repositories/drizzleAcademyMembershipRepository";
import { DrizzleAuditLogRepository } from "../../infrastructure/repositories/drizzleAuditLogRepository";
import { DrizzleCertificationRepository } from "../../infrastructure/repositories/drizzleCertificationRepository";
import { DrizzleChargeRepository } from "../../infrastructure/repositories/drizzleChargeRepository";
import { DrizzleDisciplineGradeRepository } from "../../infrastructure/repositories/drizzleDisciplineGradeRepository";
import { DrizzleMartialHistoryRepository } from "../../infrastructure/repositories/drizzleMartialHistoryRepository";
import { DrizzlePractitionerRepository } from "../../infrastructure/repositories/drizzlePractitionerRepository";

/**
 * Punto único de composición para repositorios usados por acciones
 * de practitioner-identity.
 */
export function createPractitionerIdentityAdminClient() {
  return adminSupabase;
}

export function createAcademyRepo() {
  return new DrizzleAcademyRepository();
}

export function createAcademyMembershipRepo() {
  return new DrizzleAcademyMembershipRepository();
}

export function createAuditLogRepo() {
  return new DrizzleAuditLogRepository();
}

export function createCertificationRepo() {
  return new DrizzleCertificationRepository();
}

export function createChargeRepo() {
  return new DrizzleChargeRepository();
}

export function createDisciplineGradeRepo() {
  return new DrizzleDisciplineGradeRepository();
}

export function createMartialHistoryRepo() {
  return new DrizzleMartialHistoryRepository();
}

export function createPractitionerRepo() {
  return new DrizzlePractitionerRepository();
}

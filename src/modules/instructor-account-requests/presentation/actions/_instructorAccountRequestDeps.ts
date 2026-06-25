import { SupabaseInstructorAccountRequestRepository } from "../../infrastructure/repositories/supabaseInstructorAccountRequestRepository";
import { createSupabaseInstructorAuthService } from "../../infrastructure/services/supabaseInstructorAuthService";

/**
 * Punto único de composición para solicitudes de cuenta de instructor.
 */
export function createInstructorAccountRequestRepo() {
  return new SupabaseInstructorAccountRequestRepository();
}

export function createInstructorAuthService() {
  return createSupabaseInstructorAuthService();
}

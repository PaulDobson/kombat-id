export type Grade = "white" | "yellow" | "green" | "blue" | "red" | "black";
export type Gender = "male" | "female" | "other";

/** Req 9.1 — Roles jerárquicos del practicante */
export type PractitionerRole = "alumno" | "instructor" | "profesor" | "maestro";

/** Req 9.2 — Categorías de edad */
export type AgeCategory = "infantil" | "juvenil" | "adulto" | "senior";

export interface Practitioner {
  id: string; // UUID público
  authUserId: string | null;
  rut: string; // formato: 12345678-9
  fullName: string;
  birthDate: string; // ISO date string (YYYY-MM-DD)
  gender: Gender;
  grade: Grade;
  dan: number | null;
  startDate: string; // ISO date string (YYYY-MM-DD)
  isActive: boolean;
  contactPhone: string | null;
  contactEmail: string | null;
  photoPath: string | null;
  qrToken: string; // UUID opaco para verificación QR
  weightKg: number | null;
  deactivatedAt: string | null;
  deactivationReason: string | null;
  updatedAt: string;
  createdAt: string;
  /** Req 9.1 — Rol jerárquico; opcional para compatibilidad con datos existentes */
  role?: PractitionerRole;
  /** Req 9.2 — Categoría de edad derivada de birthDate; opcional para compatibilidad */
  ageCategory?: AgeCategory;
}

/**
 * Req 9.2 — Deriva la categoría de edad a partir de la fecha de nacimiento.
 * @param birthDate ISO date string (YYYY-MM-DD)
 * @param referenceDate Fecha de referencia para el cálculo (por defecto hoy)
 */
export function deriveAgeCategory(
  birthDate: string,
  referenceDate: string = new Date().toISOString().slice(0, 10),
): AgeCategory {
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);

  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age -= 1;
  }

  if (age <= 11) return "infantil";
  if (age <= 17) return "juvenil";
  if (age <= 39) return "adulto";
  return "senior";
}

/**
 * Req 9.8, 9.9, 9.10 — Valida si un rol es compatible con el grado y dan del practicante.
 * Retorna `false` si las restricciones de grado no se cumplen para el rol dado.
 *
 * Reglas:
 * - `instructor`: requiere grado `red` o `black`
 * - `profesor`:   requiere grado `black` y dan >= 1
 * - `maestro`:    requiere grado `black` y dan >= 3
 * - `alumno`:     sin restricciones de grado
 */
export function validateRoleForGrade(
  role: PractitionerRole,
  grade: Grade,
  dan: number | null,
): boolean {
  switch (role) {
    case "alumno":
      return true;
    case "instructor":
      return grade === "red" || grade === "black";
    case "profesor":
      return grade === "black" && dan !== null && dan >= 1;
    case "maestro":
      return grade === "black" && dan !== null && dan >= 3;
  }
}

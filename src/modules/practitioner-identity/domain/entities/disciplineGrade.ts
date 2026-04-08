import type { Grade } from "./practitioner";

/** Req 13.2 — Disciplinas soportadas */
export type Discipline =
  | "kombat_taekwondo"
  | "taekwondo_wtf"
  | "hapkido"
  | "kick_boxing"
  | "defensa_personal";

/** Req 13.1 — Grado por disciplina */
export interface DisciplineGrade {
  id: string;
  practitionerId: string;
  discipline: Discipline;
  grade: Grade;
  /** Solo para cinturón negro */
  dan: number | null;
  /** Req 13.3 — Solo uno activo por disciplina */
  isActive: boolean;
  /** ISO date string (YYYY-MM-DD) */
  obtainedAt: string;
  /** Req 13.7 — Maestro certificador */
  certifyingMasterId: string | null;
  /** Certificación vinculada */
  certificationId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Req 13.9 — Calcula el grado principal del practicante a partir de sus grados por disciplina.
 * Filtra los grados activos de `kombat_taekwondo` y retorna el grado del primero encontrado,
 * o `'white'` como valor por defecto si no hay ninguno.
 */
export function derivePrimaryGrade(disciplineGrades: DisciplineGrade[]): Grade {
  const primary = disciplineGrades.find(
    (dg) => dg.isActive && dg.discipline === "kombat_taekwondo",
  );
  return primary?.grade ?? "white";
}

import type { Discipline, DisciplineGrade } from "../entities/disciplineGrade";

export interface DisciplineGradeRepository {
  /** Retorna todos los grados (activos e inactivos) de un practicante */
  findByPractitioner(practitionerId: string): Promise<DisciplineGrade[]>;

  /** Retorna solo los grados activos de un practicante */
  findActiveByPractitioner(practitionerId: string): Promise<DisciplineGrade[]>;

  /** Retorna el grado activo de un practicante en una disciplina específica, o null si no existe */
  findActiveByPractitionerAndDiscipline(
    practitionerId: string,
    discipline: Discipline,
  ): Promise<DisciplineGrade | null>;

  /** Persiste un nuevo grado o actualiza uno existente */
  save(disciplineGrade: DisciplineGrade): Promise<void>;

  /** Marca el grado como inactivo (isActive = false) */
  deactivate(id: string): Promise<void>;
}

import "server-only";

import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type { Database } from "@/types/database.types";
import type {
  Discipline,
  DisciplineGrade,
} from "../../domain/entities/disciplineGrade";
import type { DisciplineGradeRepository } from "../../domain/interfaces/disciplineGradeRepository";
import type { Grade } from "../../domain/entities/practitioner";

// ---------------------------------------------------------------------------
// Typed aliases
// ---------------------------------------------------------------------------

type DisciplineGradeRow =
  Database["public"]["Tables"]["discipline_grades"]["Row"];
type DisciplineGradeInsert =
  Database["public"]["Tables"]["discipline_grades"]["Insert"];

// ---------------------------------------------------------------------------
// Zod schema for validating rows read from the DB (Req 8.4)
// ---------------------------------------------------------------------------

const DisciplineGradeRowSchema = z.object({
  id: z.string().uuid(),
  practitioner_id: z.string().uuid(),
  discipline: z.enum([
    "kombat_taekwondo",
    "taekwondo_wtf",
    "hapkido",
    "kick_boxing",
    "defensa_personal",
  ]),
  grade: z.enum(["white", "yellow", "green", "blue", "red", "black"]),
  dan: z.number().nullable(),
  is_active: z.boolean(),
  obtained_at: z.string().min(1),
  certifying_master_id: z.string().uuid().nullable(),
  certification_id: z.string().uuid().nullable(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Repository implementation
// ---------------------------------------------------------------------------

export class DrizzleDisciplineGradeRepository implements DisciplineGradeRepository {
  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findByPractitioner(practitionerId: string): Promise<DisciplineGrade[]> {
    const { data, error } = await adminSupabase
      .from("discipline_grades")
      .select("*")
      .eq("practitioner_id", practitionerId)
      .order("obtained_at", { ascending: false });

    if (error)
      throw new DomainError(
        `Failed to find discipline grades for practitioner: ${error.message}`,
      );

    return ((data as DisciplineGradeRow[]) ?? []).map((row) =>
      this.fromRow(row),
    );
  }

  async findActiveByPractitioner(
    practitionerId: string,
  ): Promise<DisciplineGrade[]> {
    const { data, error } = await adminSupabase
      .from("discipline_grades")
      .select("*")
      .eq("practitioner_id", practitionerId)
      .eq("is_active", true)
      .order("discipline", { ascending: true });

    if (error)
      throw new DomainError(
        `Failed to find active discipline grades for practitioner: ${error.message}`,
      );

    return ((data as DisciplineGradeRow[]) ?? []).map((row) =>
      this.fromRow(row),
    );
  }

  async findActiveByPractitionerAndDiscipline(
    practitionerId: string,
    discipline: Discipline,
  ): Promise<DisciplineGrade | null> {
    const { data, error } = await adminSupabase
      .from("discipline_grades")
      .select("*")
      .eq("practitioner_id", practitionerId)
      .eq("discipline", discipline)
      .eq("is_active", true)
      .maybeSingle();

    if (error)
      throw new DomainError(
        `Failed to find active discipline grade by discipline: ${error.message}`,
      );
    if (!data) return null;

    return this.fromRow(data as DisciplineGradeRow);
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  async save(disciplineGrade: DisciplineGrade): Promise<void> {
    const row = this.toRow(disciplineGrade);

    const { error } = await adminSupabase
      .from("discipline_grades")
      .upsert(row as unknown as never);

    if (error)
      throw new DomainError(
        `Failed to save discipline grade: ${error.message}`,
      );
  }

  async deactivate(id: string): Promise<void> {
    const now = new Date().toISOString();

    const { error } = await adminSupabase
      .from("discipline_grades")
      .update({ is_active: false, updated_at: now } as unknown as never)
      .eq("id", id);

    if (error)
      throw new DomainError(
        `Failed to deactivate discipline grade: ${error.message}`,
      );
  }

  // -------------------------------------------------------------------------
  // Private mapping helpers
  // -------------------------------------------------------------------------

  private fromRow(row: DisciplineGradeRow): DisciplineGrade {
    const parsed = DisciplineGradeRowSchema.safeParse(row);

    if (!parsed.success) {
      throw new DomainError(
        `DisciplineGrade row failed schema validation: ${parsed.error.message}`,
      );
    }

    return this.toEntity(parsed.data as DisciplineGradeRow);
  }

  private toEntity(row: DisciplineGradeRow): DisciplineGrade {
    return {
      id: row.id,
      practitionerId: row.practitioner_id,
      discipline: row.discipline as Discipline,
      grade: row.grade as Grade,
      dan: row.dan,
      isActive: row.is_active,
      obtainedAt: row.obtained_at,
      certifyingMasterId: row.certifying_master_id,
      certificationId: row.certification_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toRow(disciplineGrade: DisciplineGrade): DisciplineGradeInsert {
    return {
      id: disciplineGrade.id,
      practitioner_id: disciplineGrade.practitionerId,
      discipline: disciplineGrade.discipline,
      grade: disciplineGrade.grade,
      dan: disciplineGrade.dan,
      is_active: disciplineGrade.isActive,
      obtained_at: disciplineGrade.obtainedAt,
      certifying_master_id: disciplineGrade.certifyingMasterId,
      certification_id: disciplineGrade.certificationId,
      created_at: disciplineGrade.createdAt,
      updated_at: disciplineGrade.updatedAt,
    };
  }
}

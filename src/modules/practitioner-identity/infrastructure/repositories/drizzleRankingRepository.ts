import "server-only";

import { adminSupabase } from "@/lib/supabase/admin";
import { DomainError } from "@/lib/errors";
import type { Database } from "@/types/database.types";
import type { Grade } from "../../domain/entities/practitioner";
import type {
  AgeRange,
  WeightCategory,
  RankingPosition,
  RankingSnapshot,
  RankingType,
} from "../../domain/entities/ranking";
import type {
  RankingRepository,
  RankingCategory,
} from "../../domain/interfaces/rankingRepository";

// ---------------------------------------------------------------------------
// Typed aliases
// ---------------------------------------------------------------------------

type RankingPositionRow =
  Database["public"]["Tables"]["ranking_positions"]["Row"];
type RankingSnapshotRow =
  Database["public"]["Tables"]["ranking_snapshots"]["Row"];

// ---------------------------------------------------------------------------
// Repository implementation
// ---------------------------------------------------------------------------

export class DrizzleRankingRepository implements RankingRepository {
  // -------------------------------------------------------------------------
  // findByPractitioner
  // -------------------------------------------------------------------------

  async findByPractitioner(publicId: string): Promise<RankingPosition | null> {
    const { data, error } = await adminSupabase
      .from("ranking_positions")
      .select("*")
      .eq("practitioner_id", publicId)
      .maybeSingle();

    if (error) {
      throw new DomainError(
        `Failed to find ranking position by practitioner: ${error.message}`,
      );
    }

    return data ? this.toPositionEntity(data as RankingPositionRow) : null;
  }

  // -------------------------------------------------------------------------
  // findByCategory
  // -------------------------------------------------------------------------

  async findByCategory(category: RankingCategory): Promise<RankingPosition[]> {
    const { data, error } = await adminSupabase
      .from("ranking_positions")
      .select("*")
      .eq("grade", category.grade)
      .eq("age_range", category.ageRange)
      .eq("weight_category", category.weightCategory)
      .order("position", { ascending: true });

    if (error) {
      throw new DomainError(
        `Failed to find ranking positions by category: ${error.message}`,
      );
    }

    return ((data as RankingPositionRow[]) ?? []).map((row) =>
      this.toPositionEntity(row),
    );
  }

  // -------------------------------------------------------------------------
  // recalculateCategory
  // -------------------------------------------------------------------------

  async recalculateCategory(category: RankingCategory): Promise<void> {
    // Fetch all positions in the category ordered by total_points descending
    const { data, error } = await adminSupabase
      .from("ranking_positions")
      .select("*")
      .eq("grade", category.grade)
      .eq("age_range", category.ageRange)
      .eq("weight_category", category.weightCategory)
      .order("total_points", { ascending: false });

    if (error) {
      throw new DomainError(
        `Failed to fetch ranking positions for recalculation: ${error.message}`,
      );
    }

    const rows = (data as RankingPositionRow[]) ?? [];
    const categoryCount = rows.length;
    const now = new Date().toISOString();

    // Re-assign positions (1-based) and update category_count
    const updated = rows.map((row, index) => ({
      ...row,
      position: index + 1,
      category_count: categoryCount,
      calculated_at: now,
    }));

    if (updated.length === 0) return;

    const { error: upsertError } = await adminSupabase
      .from("ranking_positions")
      .upsert(updated as unknown as never);

    if (upsertError) {
      throw new DomainError(
        `Failed to upsert recalculated ranking positions: ${upsertError.message}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // upsertPositions
  // -------------------------------------------------------------------------

  async upsertPositions(positions: RankingPosition[]): Promise<void> {
    if (positions.length === 0) return;

    const rows = positions.map((p) => ({
      id: p.id,
      practitioner_id: p.practitionerId,
      grade: p.grade,
      age_range: p.ageRange,
      weight_category: p.weightCategory,
      total_points: p.totalPoints,
      position: p.position,
      category_count: p.categoryCount,
      calculated_at: p.calculatedAt,
      ranking_type: p.rankingType,
      national_points: p.nationalPoints,
      international_points: p.internationalPoints,
      international_position: p.internationalPosition,
      combined_position: p.combinedPosition,
    }));

    const { error } = await adminSupabase
      .from("ranking_positions")
      .upsert(rows as unknown as never, {
        onConflict: "practitioner_id,grade,age_range,weight_category",
      });

    if (error) {
      throw new DomainError(
        `Failed to upsert ranking positions: ${error.message}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // saveSnapshot
  // -------------------------------------------------------------------------

  async saveSnapshot(snapshot: RankingSnapshot): Promise<void> {
    const row = {
      id: snapshot.id,
      practitioner_id: snapshot.practitionerId,
      period_type: snapshot.periodType,
      period_label: snapshot.periodLabel,
      position: snapshot.position,
      total_points: snapshot.totalPoints,
      category_count: snapshot.categoryCount,
      grade: snapshot.grade,
      age_range: snapshot.ageRange,
      weight_category: snapshot.weightCategory,
      snapshot_at: snapshot.snapshotAt,
    };

    const { error } = await adminSupabase
      .from("ranking_snapshots")
      .insert(row as unknown as never);

    if (error) {
      throw new DomainError(
        `Failed to save ranking snapshot: ${error.message}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // findSnapshots
  // -------------------------------------------------------------------------

  async findSnapshots(
    publicId: string,
    period: "monthly" | "annual",
  ): Promise<RankingSnapshot[]> {
    const { data, error } = await adminSupabase
      .from("ranking_snapshots")
      .select("*")
      .eq("practitioner_id", publicId)
      .eq("period_type", period)
      .order("snapshot_at", { ascending: false });

    if (error) {
      throw new DomainError(
        `Failed to find ranking snapshots: ${error.message}`,
      );
    }

    return ((data as RankingSnapshotRow[]) ?? []).map((row) =>
      this.toSnapshotEntity(row),
    );
  }

  // -------------------------------------------------------------------------
  // Private mapping helpers
  // -------------------------------------------------------------------------

  private toPositionEntity(row: RankingPositionRow): RankingPosition {
    return {
      id: row.id,
      practitionerId: row.practitioner_id,
      grade: row.grade as Grade,
      ageRange: row.age_range as AgeRange,
      weightCategory: row.weight_category as WeightCategory,
      totalPoints: row.total_points,
      position: row.position,
      categoryCount: row.category_count,
      calculatedAt: row.calculated_at,
      rankingType: (row.ranking_type as RankingType) ?? "national",
      nationalPoints: row.national_points ?? row.total_points,
      internationalPoints: row.international_points ?? 0,
      internationalPosition: row.international_position ?? null,
      combinedPosition: row.combined_position ?? row.position,
    };
  }

  private toSnapshotEntity(row: RankingSnapshotRow): RankingSnapshot {
    return {
      id: row.id,
      practitionerId: row.practitioner_id,
      periodType: row.period_type as "monthly" | "annual",
      periodLabel: row.period_label,
      position: row.position,
      totalPoints: row.total_points,
      categoryCount: row.category_count,
      grade: row.grade as Grade,
      ageRange: row.age_range as AgeRange,
      weightCategory: row.weight_category as WeightCategory,
      snapshotAt: row.snapshot_at,
    };
  }
}

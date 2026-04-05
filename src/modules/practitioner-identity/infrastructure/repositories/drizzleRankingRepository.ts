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

import type { Grade } from "../entities/practitioner";
import type {
  AgeRange,
  WeightCategory,
  RankingPosition,
  RankingSnapshot,
} from "../entities/ranking";

export type RankingCategory = {
  grade: Grade;
  ageRange: AgeRange;
  weightCategory: WeightCategory;
};

export interface RankingRepository {
  findByPractitioner(publicId: string): Promise<RankingPosition | null>;
  findByCategory(category: RankingCategory): Promise<RankingPosition[]>;
  recalculateCategory(category: RankingCategory): Promise<void>;
  saveSnapshot(snapshot: RankingSnapshot): Promise<void>;
  findSnapshots(
    publicId: string,
    period: "monthly" | "annual",
  ): Promise<RankingSnapshot[]>;
}

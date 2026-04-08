import type { Grade } from "./practitioner";

export type AgeRange = "under-12" | "12-17" | "18-30" | "30+";
export type WeightCategory =
  | "fin"
  | "fly"
  | "bantam"
  | "feather"
  | "light"
  | "welter"
  | "middle"
  | "heavy";

// Requirements: 11.2, 11.3, 11.4
export type RankingType = "national" | "international" | "combined";

export interface RankingPosition {
  id: string;
  practitionerId: string;
  grade: Grade;
  ageRange: AgeRange;
  weightCategory: WeightCategory;
  totalPoints: number;
  position: number;
  categoryCount: number;
  calculatedAt: string;
  // Ranking internacional (Requirements: 11.2, 11.3, 11.4)
  rankingType: RankingType;
  nationalPoints: number;
  internationalPoints: number;
  internationalPosition: number | null; // null si no tiene resultados internacionales
  combinedPosition: number;
}

export interface RankingSnapshot {
  id: string;
  practitionerId: string;
  periodType: "monthly" | "annual";
  periodLabel: string; // e.g. '2025-01' or '2025'
  position: number;
  totalPoints: number;
  categoryCount: number;
  grade: Grade;
  ageRange: AgeRange;
  weightCategory: WeightCategory;
  snapshotAt: string;
}

import { z } from "zod";
import type {
  RankingRepository,
  RankingCategory,
} from "../../domain/interfaces/rankingRepository";
import type { PractitionerRepository } from "../../domain/interfaces/practitionerRepository";
import type { MartialHistoryRepository } from "../../domain/interfaces/martialHistoryRepository";
import type {
  RankingPosition,
  AgeRange,
  WeightCategory,
} from "../../domain/entities/ranking";
import type { Practitioner } from "../../domain/entities/practitioner";
import { calculatePoints } from "../../domain/value-objects/calculatePoints";
import { calculateInternationalPoints } from "../../domain/value-objects/calculateInternationalPoints";

export const RecalculateRankingInputSchema = z.object({
  grade: z.enum(["white", "yellow", "green", "blue", "red", "black"]),
  ageRange: z.enum(["under-12", "12-17", "18-30", "30+"]),
  weightCategory: z.enum([
    "fin",
    "fly",
    "bantam",
    "feather",
    "light",
    "welter",
    "middle",
    "heavy",
  ]),
});

export type RecalculateRankingInput = z.infer<
  typeof RecalculateRankingInputSchema
>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derives the AgeRange from a birth date string (YYYY-MM-DD).
 * Requirements: 4.1
 */
function deriveAgeRange(
  birthDate: string,
  referenceDate: string = new Date().toISOString().slice(0, 10),
): AgeRange {
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);

  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age -= 1;
  }

  if (age < 12) return "under-12";
  if (age <= 17) return "12-17";
  if (age <= 30) return "18-30";
  return "30+";
}

/**
 * Derives the WeightCategory from weight in kg.
 * Returns null if weightKg is null (practitioner not categorized).
 * Requirements: 4.1
 */
function deriveWeightCategory(weightKg: number | null): WeightCategory | null {
  if (weightKg === null) return null;
  if (weightKg <= 54) return "fin";
  if (weightKg <= 58) return "fly";
  if (weightKg <= 63) return "bantam";
  if (weightKg <= 68) return "feather";
  if (weightKg <= 74) return "light";
  if (weightKg <= 80) return "welter";
  if (weightKg <= 87) return "middle";
  return "heavy";
}

// ---------------------------------------------------------------------------
// Use case
// ---------------------------------------------------------------------------

/**
 * Recalculates the national, international, and combined rankings for a
 * given category (grade + ageRange + weightCategory).
 *
 * Algorithm:
 * 1. Fetch all active practitioners with the matching grade.
 * 2. Filter by derived ageRange and weightCategory.
 * 3. For each practitioner, sum points from their competition history:
 *    - National points: entries with eventScope = 'national' or null
 *    - International points: entries with eventScope = 'international' (×1.5)
 *    - Combined points: national + international
 * 4. Sort and assign positions for each ranking type.
 * 5. Persist via repository.
 *
 * Requirements: 11.2, 11.3, 11.4
 */
export async function recalculateRanking(
  input: RecalculateRankingInput,
  deps: {
    rankingRepo: RankingRepository;
    practitionerRepo: PractitionerRepository;
    martialHistoryRepo: MartialHistoryRepository;
  },
): Promise<void> {
  const parsed = RecalculateRankingInputSchema.parse(input);

  const category: RankingCategory = {
    grade: parsed.grade,
    ageRange: parsed.ageRange,
    weightCategory: parsed.weightCategory,
  };

  // 1. Get all active practitioners with the matching grade
  const activePractitioners = await deps.practitionerRepo.findActiveByGrade(
    parsed.grade,
  );

  // 2. Filter by ageRange and weightCategory
  const practitioners = activePractitioners.filter((p: Practitioner) => {
    const ageRange = deriveAgeRange(p.birthDate);
    const weightCategory = deriveWeightCategory(p.weightKg);
    return (
      ageRange === parsed.ageRange && weightCategory === parsed.weightCategory
    );
  });

  if (practitioners.length === 0) {
    // No practitioners in this category — nothing to persist
    return;
  }

  // 3. Compute points for each practitioner
  const pointsData = await Promise.all(
    practitioners.map(async (p: Practitioner) => {
      const history = await deps.martialHistoryRepo.findByPractitionerId(p.id);

      // Only competition entries contribute to ranking
      const competitionEntries = history.filter(
        (e) => e.eventType === "competition" && !e.isCorrected,
      );

      let nationalPoints = 0;
      let internationalPoints = 0;

      for (const entry of competitionEntries) {
        const base = calculatePoints(entry.result);
        if (entry.eventScope === "international") {
          internationalPoints += calculateInternationalPoints(base);
        } else {
          // eventScope = 'national' or null → counts as national
          nationalPoints += base;
        }
      }

      const combinedPoints = nationalPoints + internationalPoints;

      return {
        practitionerId: p.id,
        nationalPoints,
        internationalPoints,
        combinedPoints,
      };
    }),
  );

  const categoryCount = practitioners.length;
  const now = new Date().toISOString();

  // 4. Assign positions for each ranking type

  // National ranking: sort by nationalPoints desc
  const byNational = [...pointsData].sort(
    (a, b) => b.nationalPoints - a.nationalPoints,
  );

  // International ranking: only practitioners with internationalPoints > 0
  const withInternational = pointsData.filter((p) => p.internationalPoints > 0);
  const byInternational = [...withInternational].sort(
    (a, b) => b.internationalPoints - a.internationalPoints,
  );
  const internationalPositionMap = new Map<string, number>(
    byInternational.map((p, i) => [p.practitionerId, i + 1]),
  );

  // Combined ranking: sort by combinedPoints desc
  const byCombined = [...pointsData].sort(
    (a, b) => b.combinedPoints - a.combinedPoints,
  );
  const combinedPositionMap = new Map<string, number>(
    byCombined.map((p, i) => [p.practitionerId, i + 1]),
  );

  // 5. Build RankingPosition objects
  const positions: RankingPosition[] = byNational.map((p, index) => ({
    id: crypto.randomUUID(),
    practitionerId: p.practitionerId,
    grade: category.grade,
    ageRange: category.ageRange,
    weightCategory: category.weightCategory,
    // National position and points (primary ranking)
    totalPoints: p.nationalPoints,
    position: index + 1,
    categoryCount,
    calculatedAt: now,
    // Extended ranking fields (Requirements: 11.2, 11.3, 11.4)
    rankingType: "national",
    nationalPoints: p.nationalPoints,
    internationalPoints: p.internationalPoints,
    internationalPosition:
      internationalPositionMap.get(p.practitionerId) ?? null,
    combinedPosition: combinedPositionMap.get(p.practitionerId) ?? index + 1,
  }));

  // 6. Persist updated positions
  await deps.rankingRepo.upsertPositions(positions);
}

import { z } from "zod";
import type {
  RankingRepository,
  RankingCategory,
} from "../../domain/interfaces/rankingRepository";

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

export async function recalculateRanking(
  input: RecalculateRankingInput,
  deps: { rankingRepo: RankingRepository },
): Promise<void> {
  const parsed = RecalculateRankingInputSchema.parse(input);

  const category: RankingCategory = {
    grade: parsed.grade,
    ageRange: parsed.ageRange,
    weightCategory: parsed.weightCategory,
  };

  await deps.rankingRepo.recalculateCategory(category);
}

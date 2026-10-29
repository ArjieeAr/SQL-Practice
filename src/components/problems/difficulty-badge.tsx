import type { Enums } from "@/types/database";

type Difficulty = Enums<"difficulty">;

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const COLOR: Record<Difficulty, string> = {
  easy: "text-easy",
  medium: "text-medium",
  hard: "text-hard",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`text-sm font-medium ${COLOR[difficulty]}`}>
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

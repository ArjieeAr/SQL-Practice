import type { Enums } from "@/types/database";

import type { Tag } from "./tags";

/** The fields filtering needs; matches ProblemSummary without importing server code. */
export interface FilterableProblem {
  number: number;
  slug: string;
  title: string;
  difficulty: Enums<"difficulty">;
  tags: string[];
}

export type StatusFilter = "all" | "solved" | "unsolved";

export interface ProblemFilters {
  query: string;
  difficulty: Enums<"difficulty"> | "all";
  /** A problem must have every selected tag. */
  tags: Tag[];
  status: StatusFilter;
}

export const NO_FILTERS: ProblemFilters = { query: "", difficulty: "all", tags: [], status: "all" };

export function filterProblems<P extends FilterableProblem>(
  problems: P[],
  { query, difficulty, tags, status }: ProblemFilters,
  solvedSlugs: ReadonlySet<string>,
): P[] {
  const needle = query.trim().toLowerCase();

  return problems.filter((p) => {
    // "12" finds problem 12 as well as titles containing "12".
    if (needle && !p.title.toLowerCase().includes(needle) && String(p.number) !== needle) {
      return false;
    }
    if (difficulty !== "all" && p.difficulty !== difficulty) return false;
    if (!tags.every((tag) => p.tags.includes(tag))) return false;
    if (status === "solved" && !solvedSlugs.has(p.slug)) return false;
    if (status === "unsolved" && solvedSlugs.has(p.slug)) return false;
    return true;
  });
}

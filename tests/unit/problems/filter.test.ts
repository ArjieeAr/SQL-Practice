import { describe, expect, it } from "vitest";

import { filterProblems, NO_FILTERS, type FilterableProblem } from "@/lib/problems/filter";

const problems: FilterableProblem[] = [
  {
    number: 1,
    slug: "a",
    title: "Silent Shoppers",
    difficulty: "easy",
    tags: ["joins", "null-handling"],
  },
  { number: 2, slug: "b", title: "Shelf Count", difficulty: "easy", tags: ["group-by"] },
  {
    number: 12,
    slug: "c",
    title: "Best Sellers",
    difficulty: "medium",
    tags: ["joins", "window-functions"],
  },
  { number: 21, slug: "d", title: "Org Chart Depth", difficulty: "hard", tags: ["ctes"] },
];

const numbers = (result: FilterableProblem[]) => result.map((p) => p.number);
const none = new Set<string>();

describe("filterProblems", () => {
  it("returns everything with no filters", () => {
    expect(numbers(filterProblems(problems, NO_FILTERS, none))).toEqual([1, 2, 12, 21]);
  });

  it("searches titles case-insensitively", () => {
    expect(numbers(filterProblems(problems, { ...NO_FILTERS, query: "  SHELF " }, none))).toEqual([
      2,
    ]);
  });

  it("matches a problem number exactly, not as a substring", () => {
    expect(numbers(filterProblems(problems, { ...NO_FILTERS, query: "12" }, none))).toEqual([12]);
    expect(numbers(filterProblems(problems, { ...NO_FILTERS, query: "1" }, none))).toEqual([1]);
  });

  it("filters by difficulty", () => {
    expect(numbers(filterProblems(problems, { ...NO_FILTERS, difficulty: "easy" }, none))).toEqual([
      1, 2,
    ]);
  });

  it("requires every selected tag", () => {
    expect(numbers(filterProblems(problems, { ...NO_FILTERS, tags: ["joins"] }, none))).toEqual([
      1, 12,
    ]);
    expect(
      numbers(
        filterProblems(problems, { ...NO_FILTERS, tags: ["joins", "window-functions"] }, none),
      ),
    ).toEqual([12]);
  });

  it("filters by solved status", () => {
    const solved = new Set(["a", "d"]);
    expect(numbers(filterProblems(problems, { ...NO_FILTERS, status: "solved" }, solved))).toEqual([
      1, 21,
    ]);
    expect(
      numbers(filterProblems(problems, { ...NO_FILTERS, status: "unsolved" }, solved)),
    ).toEqual([2, 12]);
  });

  it("combines filters", () => {
    const result = filterProblems(
      problems,
      { query: "s", difficulty: "easy", tags: ["group-by"], status: "unsolved" },
      new Set(["a"]),
    );
    expect(numbers(result)).toEqual([2]);
  });
});

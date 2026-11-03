/**
 * Content integrity: every problem in content/problems must be gradeable. Each reference solution
 * runs on the sample data and every hidden case, and every known-wrong "pitfall" query must be
 * rejected by at least one hidden case, which shows the cases really cover the edge cases.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { loadProblems } from "@/lib/problems/content";
import { checkPublishRules, verifyProblem, type ProblemVerification } from "@/lib/problems/verify";

const problems = await loadProblems();

describe("problem set", () => {
  it("has 15–20 problems", () => {
    expect(problems.length).toBeGreaterThanOrEqual(15);
    expect(problems.length).toBeLessThanOrEqual(20);
  });

  it("numbers problems 1..n with no gaps", () => {
    expect(problems.map((p) => p.number)).toEqual(problems.map((_, i) => i + 1));
  });

  it("has unique titles", () => {
    expect(new Set(problems.map((p) => p.title)).size).toBe(problems.length);
  });

  it("covers every difficulty with at least 4 problems", () => {
    for (const difficulty of ["easy", "medium", "hard"]) {
      expect(problems.filter((p) => p.difficulty === difficulty).length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe.each(problems)("$number. $title", (problem) => {
  let verification: ProblemVerification;
  beforeAll(async () => {
    verification = await verifyProblem(problem);
  });

  it("has 2–3 hidden test cases", () => {
    expect(problem.cases.length).toBeGreaterThanOrEqual(2);
    expect(problem.cases.length).toBeLessThanOrEqual(3);
  });

  it("passes the rules every published problem must meet", () => {
    expect(checkPublishRules(problem, verification)).toEqual([]);
  });

  it("describes every sample table for the schema viewer", () => {
    for (const table of verification.sampleTables) {
      expect(table.columns.length).toBeGreaterThan(0);
      expect(table.rows.columns.map((c) => c.name)).toEqual(table.columns.map((c) => c.name));
    }
  });

  it("runs the reference on every hidden case", () => {
    expect(verification.cases.map((c) => c.name)).toEqual(problem.cases.map((c) => c.name));
  });
});

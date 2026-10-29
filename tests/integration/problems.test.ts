/**
 * Content integrity: every problem in content/problems must be gradeable. Each reference solution
 * runs on the sample data and every hidden case, and every known-wrong "pitfall" query must be
 * rejected by at least one hidden case, which shows the cases really cover the edge cases.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { loadProblems } from "@/lib/problems/content";
import { verifyProblem, type ProblemVerification } from "@/lib/problems/verify";
import { createSnapshot } from "@/lib/sandbox/engine.mjs";
import { checkUserQuery } from "@/lib/sql/guard";

const problems = await loadProblems();

let snapshot: SharedArrayBuffer;
beforeAll(async () => {
  snapshot = await createSnapshot();
});

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
    verification = await verifyProblem(problem, snapshot);
  });

  it("has 2–3 hidden test cases", () => {
    expect(problem.cases.length).toBeGreaterThanOrEqual(2);
    expect(problem.cases.length).toBeLessThanOrEqual(3);
  });

  it("has a reference solution that passes the query guard", () => {
    expect(checkUserQuery(problem.solutionSql)).toEqual({ ok: true });
  });

  it("sorts its reference output when row order matters", () => {
    if (problem.orderMatters) expect(problem.solutionSql).toMatch(/\border\s+by\b/i);
  });

  it("returns rows on the sample data, so Run has something to show", () => {
    expect(verification.sampleExpected.rows.length).toBeGreaterThan(0);
  });

  it("describes every sample table for the schema viewer", () => {
    expect(verification.sampleTables.length).toBeGreaterThan(0);
    for (const table of verification.sampleTables) {
      expect(table.columns.length).toBeGreaterThan(0);
      expect(table.rows.columns.map((c) => c.name)).toEqual(table.columns.map((c) => c.name));
    }
  });

  it("runs the reference on every hidden case", () => {
    expect(verification.cases.map((c) => c.name)).toEqual(problem.cases.map((c) => c.name));
  });

  it("rejects every known pitfall with some hidden case", () => {
    const uncaught = verification.pitfalls.filter((p) => p.caughtBy === null).map((p) => p.name);
    expect(uncaught).toEqual([]);
  });
});

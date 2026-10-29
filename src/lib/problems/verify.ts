/**
 * Runs a problem definition through the real sandbox to check it is gradeable. Used by the
 * content integrity test and by the seed script, which refuses to upload a broken problem.
 */
import { createSandbox, runReadOnlyQuery, SandboxQueryError } from "@/lib/sandbox/engine.mjs";
import { compareResults } from "@/lib/sql/compare";
import { LIMITS } from "@/lib/sql/limits";
import type { RawResult } from "@/lib/sql/types";

import type { ProblemDefinition } from "./content";
import { introspectTables } from "./introspect";
import type { SampleTable } from "./preview";

export interface ProblemVerification {
  /** The reference result on the public sample data, shown to users as "expected output". */
  sampleExpected: RawResult;
  /** The sample tables (columns + rows), for the problem's schema viewer. */
  sampleTables: SampleTable[];
  cases: { name: string; expected: RawResult }[];
  /** For each known-wrong query, the first hidden case that rejects it (null: none do). */
  pitfalls: { name: string; caughtBy: string | null }[];
}

type PitfallOutcome = "passed" | "wrong" | { error: string };

/** Load one dataset, then run the reference and every pitfall against it. */
async function runDataset(
  problem: ProblemDefinition,
  dataSql: string,
  label: string,
  snapshot: SharedArrayBuffer | undefined,
  { withTables = false } = {},
) {
  let db;
  try {
    db = await createSandbox(`${problem.schemaSql}\n${dataSql}`, snapshot);
  } catch (err) {
    throw new Error(`${problem.slug}: ${label} failed to load: ${(err as Error).message}`);
  }
  try {
    let expected: RawResult;
    try {
      expected = await runReadOnlyQuery(db, problem.solutionSql, LIMITS.maxResultRows);
    } catch (err) {
      throw new Error(`${problem.slug}: reference failed on ${label}: ${(err as Error).message}`);
    }
    if (expected.truncated) {
      throw new Error(`${problem.slug}: reference result on ${label} exceeds the row limit`);
    }

    // One at a time: each query opens a transaction and a cursor on this single connection, so
    // running them concurrently would interleave and fail for reasons unrelated to the SQL.
    const pitfallOutcomes: PitfallOutcome[] = [];
    for (const pitfall of problem.pitfalls) {
      try {
        const actual = await runReadOnlyQuery(db, pitfall.sql, LIMITS.maxResultRows);
        const { equal } = compareResults(expected, actual, { orderMatters: problem.orderMatters });
        pitfallOutcomes.push(equal ? "passed" : "wrong");
      } catch (err) {
        if (!(err instanceof SandboxQueryError)) throw err;
        pitfallOutcomes.push({ error: err.message });
      }
    }
    const tables = withTables ? await introspectTables(db) : [];
    return { expected, pitfallOutcomes, tables };
  } finally {
    await db.close();
  }
}

export async function verifyProblem(
  problem: ProblemDefinition,
  snapshot?: SharedArrayBuffer,
): Promise<ProblemVerification> {
  // Sequential on purpose: PGlite is single-threaded, so parallel instances only add memory.
  const sample = await runDataset(problem, problem.sampleDataSql, "sample data", snapshot, {
    withTables: true,
  });

  // A pitfall should be a plausible wrong answer, not broken SQL: it must at least run.
  sample.pitfallOutcomes.forEach((outcome, i) => {
    if (typeof outcome === "object") {
      throw new Error(
        `${problem.slug}: pitfall "${problem.pitfalls[i].name}" errors on the sample data: ${outcome.error}`,
      );
    }
  });

  const cases: ProblemVerification["cases"] = [];
  const caughtBy: (string | null)[] = problem.pitfalls.map(() => null);
  for (const testCase of problem.cases) {
    const run = await runDataset(problem, testCase.sql, `case "${testCase.name}"`, snapshot);
    cases.push({ name: testCase.name, expected: run.expected });
    // An error on a hidden case (e.g. division by zero on an edge case) is a rejection too.
    run.pitfallOutcomes.forEach((outcome, i) => {
      if (outcome !== "passed") caughtBy[i] ??= testCase.name;
    });
  }

  return {
    sampleExpected: sample.expected,
    sampleTables: sample.tables,
    cases,
    pitfalls: problem.pitfalls.map((p, i) => ({ name: p.name, caughtBy: caughtBy[i] })),
  };
}

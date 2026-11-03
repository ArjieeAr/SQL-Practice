/**
 * Runs a problem through the real sandbox to check it is gradeable. Used by the content integrity
 * test, the seed script, and the admin editor, which refuses to publish a broken problem. The SQL
 * may come from a user's proposal, so every dataset runs in a worker thread that can be killed.
 */
import { runDatasetInWorker } from "@/lib/sandbox/run-case";
import type { RunCaseOptions } from "@/lib/sandbox/run-case";
import { compareResults } from "@/lib/sql/compare";
import { LIMITS } from "@/lib/sql/limits";
import type { RawResult } from "@/lib/sql/types";

import { checkProblemShape, type AuthoredProblem } from "./authoring";
import type { SampleTable } from "./preview";

/** What verification needs to know about a problem; content files and the editor both provide it. */
export type VerifiableProblem = Pick<
  AuthoredProblem,
  "schemaSql" | "sampleDataSql" | "solutionSql" | "orderMatters" | "pitfalls"
> & {
  slug: string;
  /** Hidden test cases. A content file's extra fields are ignored. */
  cases: { name: string; sql: string }[];
};

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
  problem: VerifiableProblem,
  dataSql: string,
  label: string,
  { withTables = false, ...options }: RunCaseOptions & { withTables?: boolean } = {},
) {
  const run = await runDatasetInWorker(
    {
      setupSql: `${problem.schemaSql}\n${dataSql}`,
      referenceSql: problem.solutionSql,
      pitfallSqls: problem.pitfalls.map((p) => p.sql),
      maxRows: LIMITS.maxResultRows,
      withTables,
    },
    options,
  );

  switch (run.type) {
    case "setup_error":
      throw new Error(`${problem.slug}: ${label} failed to load: ${run.message}`);
    case "reference_error":
      throw new Error(`${problem.slug}: reference failed on ${label}: ${run.message}`);
    case "internal_error":
      throw new Error(`${problem.slug}: ${label}: ${run.message}`);
    case "timeout":
      throw new Error(`${problem.slug}: ${label} took too long to run`);
  }

  if (run.expected.truncated) {
    throw new Error(`${problem.slug}: reference result on ${label} exceeds the row limit`);
  }

  const pitfallOutcomes = run.pitfalls.map((pitfall): PitfallOutcome => {
    if ("error" in pitfall) return { error: pitfall.error };
    const { equal } = compareResults(run.expected, pitfall.result, {
      orderMatters: problem.orderMatters,
    });
    return equal ? "passed" : "wrong";
  });
  return { expected: run.expected, pitfallOutcomes, tables: run.tables };
}

export async function verifyProblem(
  problem: VerifiableProblem,
  options: RunCaseOptions = {},
): Promise<ProblemVerification> {
  // Sequential on purpose: PGlite is single-threaded, so parallel instances only add memory.
  const sample = await runDataset(problem, problem.sampleDataSql, "sample data", {
    ...options,
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
    const run = await runDataset(problem, testCase.sql, `case "${testCase.name}"`, options);
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

/** Everything that must hold before a problem can go live. Returns one message per failed rule. */
export function checkPublishRules(
  problem: Parameters<typeof checkProblemShape>[0],
  verification: ProblemVerification,
): string[] {
  const issues = checkProblemShape(problem);
  if (verification.sampleExpected.rows.length === 0) {
    issues.push("The reference returns no rows on the sample data, so Run has nothing to show.");
  }
  if (verification.sampleTables.length === 0) {
    issues.push("The schema doesn't create any tables.");
  }
  for (const pitfall of verification.pitfalls) {
    if (pitfall.caughtBy === null) {
      issues.push(`No hidden test case rejects the pitfall "${pitfall.name}".`);
    }
  }
  return issues;
}

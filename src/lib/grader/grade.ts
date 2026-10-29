import { runCaseInWorker } from "@/lib/sandbox/run-case";
import type { CaseJob, CaseRun } from "@/lib/sandbox/protocol";
import { compareResults } from "@/lib/sql/compare";
import { checkUserQuery } from "@/lib/sql/guard";
import { LIMITS } from "@/lib/sql/limits";
import type { Enums } from "@/types/database";

/** Tied to the database enum, so a migration that changes it breaks the build here. */
export type SubmissionStatus = Enums<"submission_status">;
export type CaseStatus = "passed" | "failed" | "error" | "timeout" | "skipped";

export interface TestCaseInput {
  name: string;
  dataSql: string;
}

export interface GradeInput {
  userSql: string;
  referenceSql: string;
  schemaSql: string;
  testCases: TestCaseInput[];
  orderMatters: boolean;
}

export interface CaseResult {
  name: string;
  status: CaseStatus;
  message?: string;
}

export interface GradeResult {
  status: SubmissionStatus;
  /** Total time spent in the user's query across cases; only set when accepted. */
  runtimeMs: number | null;
  cases: CaseResult[];
  /** The first user-facing error, e.g. a syntax error with its position in the query. */
  error?: { message: string; position?: number };
}

/** A problem on our side (broken test data or reference solution). Never the user's fault. */
export class GradingError extends Error {
  name = "GradingError";
}

export type CaseRunner = (job: CaseJob) => Promise<CaseRun>;

/**
 * Grade a submission against every hidden test case, LeetCode-style: cases run in order and
 * grading stops at the first failure (the remaining cases are reported as skipped).
 */
export async function gradeSubmission(
  input: GradeInput,
  runCase: CaseRunner = runCaseInWorker,
): Promise<GradeResult> {
  const skipFrom = (start: number): CaseResult[] =>
    input.testCases.slice(start).map(({ name }) => ({ name, status: "skipped" }));

  const guard = checkUserQuery(input.userSql);
  if (!guard.ok) {
    return {
      status: "error",
      runtimeMs: null,
      cases: skipFrom(0),
      error: { message: guard.message },
    };
  }

  const cases: CaseResult[] = [];
  let runtimeMs = 0;

  for (const [index, testCase] of input.testCases.entries()) {
    const run = await runCase({
      setupSql: `${input.schemaSql}\n${testCase.dataSql}`,
      referenceSql: input.referenceSql,
      userSql: input.userSql,
      maxRows: LIMITS.maxResultRows,
    });
    const rest = () => skipFrom(index + 1);
    const { name } = testCase;

    switch (run.type) {
      case "internal_error":
        throw new GradingError(`Test case "${name}": ${run.message}`);

      case "timeout": {
        const message = `Time limit exceeded (${LIMITS.queryTimeoutMs / 1000}s).`;
        cases.push({ name, status: "timeout", message });
        return { status: "timeout", runtimeMs: null, cases: [...cases, ...rest()] };
      }

      case "user_error":
        cases.push({ name, status: "error", message: run.message });
        return {
          status: "error",
          runtimeMs: null,
          cases: [...cases, ...rest()],
          error: { message: run.message, position: run.position },
        };

      case "completed": {
        if (run.expected.truncated) {
          throw new GradingError(`Test case "${name}": reference result exceeds the row limit.`);
        }
        const outcome = run.actual.truncated
          ? {
              equal: false as const,
              message: `Your query returned more than ${LIMITS.maxResultRows} rows.`,
            }
          : compareResults(run.expected, run.actual, { orderMatters: input.orderMatters });

        if (!outcome.equal) {
          cases.push({ name, status: "failed", message: outcome.message });
          return { status: "wrong_answer", runtimeMs: null, cases: [...cases, ...rest()] };
        }
        cases.push({ name, status: "passed" });
        runtimeMs += run.runtimeMs;
      }
    }
  }

  return { status: "accepted", runtimeMs, cases };
}

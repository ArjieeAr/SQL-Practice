import { describe, expect, it, vi } from "vitest";

import { gradeSubmission, GradingError, type CaseRunner } from "@/lib/grader/grade";
import type { CaseRun } from "@/lib/sandbox/protocol";
import type { RawResult } from "@/lib/sql/types";

const INT4 = 23;
const rows = (...values: string[]): RawResult => ({
  columns: [{ name: "n", typeId: INT4 }],
  rows: values.map((v) => [v]),
  truncated: false,
});

const input = {
  userSql: "SELECT n FROM t",
  referenceSql: "SELECT n FROM t",
  schemaSql: "CREATE TABLE t (n int);",
  testCases: [
    { name: "basic", dataSql: "INSERT INTO t VALUES (1);" },
    { name: "nulls", dataSql: "INSERT INTO t VALUES (NULL);" },
    { name: "empty", dataSql: "" },
  ],
  orderMatters: false,
};

/** A fake runner that returns the given outcomes in order, one per test case. */
const runnerReturning = (...runs: CaseRun[]) => {
  const fn = vi.fn<CaseRunner>();
  runs.forEach((run) => fn.mockResolvedValueOnce(run));
  return fn;
};

const completed = (expected: RawResult, actual: RawResult, runtimeMs = 5): CaseRun => ({
  type: "completed",
  expected,
  actual,
  runtimeMs,
});

describe("gradeSubmission", () => {
  it("accepts when every case matches and sums the runtime", async () => {
    const run = runnerReturning(
      completed(rows("1"), rows("1"), 4),
      completed(rows("2"), rows("2"), 6),
      completed(rows(), rows(), 1),
    );
    const result = await gradeSubmission(input, run);
    expect(result.status).toBe("accepted");
    expect(result.runtimeMs).toBe(11);
    expect(result.cases.map((c) => c.status)).toEqual(["passed", "passed", "passed"]);
  });

  it("passes the schema and that case's data to the sandbox", async () => {
    const run = runnerReturning(
      completed(rows(), rows()),
      completed(rows(), rows()),
      completed(rows(), rows()),
    );
    await gradeSubmission(input, run);
    expect(run.mock.calls[1][0].setupSql).toBe(
      "CREATE TABLE t (n int);\nINSERT INTO t VALUES (NULL);",
    );
  });

  it("stops at the first wrong answer and skips the rest", async () => {
    const run = runnerReturning(
      completed(rows("1"), rows("1")),
      completed(rows("1", "2"), rows("1")),
    );
    const result = await gradeSubmission(input, run);
    expect(result.status).toBe("wrong_answer");
    expect(result.runtimeMs).toBeNull();
    expect(result.cases).toEqual([
      { name: "basic", status: "passed" },
      { name: "nulls", status: "failed", message: "Expected 2 rows, got 1." },
      { name: "empty", status: "skipped" },
    ]);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("reports user errors with the position in the query", async () => {
    const run = runnerReturning({
      type: "user_error",
      message: 'column "x" does not exist',
      position: 8,
    });
    const result = await gradeSubmission(input, run);
    expect(result.status).toBe("error");
    expect(result.error).toEqual({ message: 'column "x" does not exist', position: 8 });
    expect(result.cases.map((c) => c.status)).toEqual(["error", "skipped", "skipped"]);
  });

  it("reports timeouts", async () => {
    const result = await gradeSubmission(input, runnerReturning({ type: "timeout" }));
    expect(result.status).toBe("timeout");
    expect(result.cases[0].status).toBe("timeout");
  });

  it("treats a result over the row limit as a wrong answer", async () => {
    const huge = { ...rows("1"), truncated: true };
    const result = await gradeSubmission(input, runnerReturning(completed(rows("1"), huge)));
    expect(result.status).toBe("wrong_answer");
    expect(result.cases[0].message).toMatch(/more than \d+ rows/);
  });

  it("rejects non-read queries before touching the sandbox", async () => {
    const run = vi.fn<CaseRunner>();
    const result = await gradeSubmission({ ...input, userSql: "DROP TABLE t" }, run);
    expect(result.status).toBe("error");
    expect(run).not.toHaveBeenCalled();
  });

  it("throws GradingError for problems on our side, not the user's", async () => {
    const run = runnerReturning({ type: "internal_error", message: "Reference solution failed" });
    await expect(gradeSubmission(input, run)).rejects.toBeInstanceOf(GradingError);
  });
});

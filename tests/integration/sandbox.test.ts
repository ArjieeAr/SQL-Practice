/**
 * Runs real worker threads with a real PGlite. Slower than the unit tests (each case boots a
 * WASM Postgres), but this is what proves the sandbox's safety properties actually hold.
 */
import { describe, expect, it } from "vitest";

import { gradeSubmission } from "@/lib/grader/grade";
import type { CaseJob } from "@/lib/sandbox/protocol";
import { runCaseInWorker } from "@/lib/sandbox/run-case";

const schemaSql = `
  CREATE TABLE employees (id int PRIMARY KEY, name text NOT NULL, dept text, salary numeric(10,2));
`;
const dataSql = `
  INSERT INTO employees VALUES
    (1, 'Ada', 'eng', 120000), (2, 'Grace', 'eng', 120000),
    (3, 'Linus', 'ops', 90000), (4, 'Margaret', NULL, 100000);
`;
const reference = "SELECT dept, max(salary) AS top FROM employees GROUP BY dept";

const job = (userSql: string, overrides: Partial<CaseJob> = {}): CaseJob => ({
  setupSql: schemaSql + dataSql,
  referenceSql: reference,
  userSql,
  maxRows: 1000,
  ...overrides,
});

describe("runCaseInWorker", () => {
  it("returns both result sets as raw Postgres text", async () => {
    const run = await runCaseInWorker(job("SELECT dept, max(salary) FROM employees GROUP BY 1"));
    expect(run.type).toBe("completed");
    if (run.type !== "completed") return;
    expect(run.actual.rows).toHaveLength(3);
    expect(run.actual.rows).toContainEqual([null, "100000.00"]);
    expect(run.runtimeMs).toBeGreaterThanOrEqual(0);
  });

  it("reports syntax errors with a position relative to the user's query", async () => {
    const run = await runCaseInWorker(job("SELECT nme FROM employees"));
    expect(run).toMatchObject({ type: "user_error", position: 8 });
    expect(run.type === "user_error" && run.message).toMatch(/column "nme" does not exist/);
  });

  it("rejects multiple statements", async () => {
    const run = await runCaseInWorker(job("SELECT 1; DROP TABLE employees"));
    expect(run).toMatchObject({ type: "user_error" });
  });

  it("rejects data-modifying CTEs", async () => {
    const run = await runCaseInWorker(
      job("WITH gone AS (DELETE FROM employees RETURNING *) SELECT * FROM gone"),
    );
    expect(run).toMatchObject({ type: "user_error" });
  });

  it("caps the number of rows fetched", async () => {
    const run = await runCaseInWorker(
      job("SELECT g FROM generate_series(1, 5000) g", { maxRows: 100 }),
    );
    expect(run.type === "completed" && run.actual).toMatchObject({ truncated: true });
    expect(run.type === "completed" && run.actual.rows).toHaveLength(100);
  });

  it("kills a runaway query at the timeout", async () => {
    const started = Date.now();
    const run = await runCaseInWorker(job("SELECT count(*) FROM generate_series(1, 10000000000)"), {
      queryTimeoutMs: 500,
    });
    expect(run).toEqual({ type: "timeout" });
    // Boot (a few seconds at most) + 500ms budget; without the worker this would run for minutes.
    expect(Date.now() - started).toBeLessThan(15_000);
  });

  it("reports broken test data as an internal error, not the user's fault", async () => {
    const run = await runCaseInWorker(job("SELECT 1", { setupSql: "CREATE TABLE oops (" }));
    expect(run).toMatchObject({ type: "internal_error" });
  });
});

describe("gradeSubmission (end to end)", () => {
  const testCases = [
    { name: "ties and NULL dept", dataSql },
    { name: "empty table", dataSql: "" },
  ];

  it("accepts an equivalent query written differently", async () => {
    const result = await gradeSubmission({
      userSql: `
        SELECT e.dept, e.salary
        FROM employees e
        WHERE e.salary = (SELECT max(salary) FROM employees x WHERE x.dept IS NOT DISTINCT FROM e.dept)
        GROUP BY e.dept, e.salary`,
      referenceSql: reference,
      schemaSql,
      testCases,
      orderMatters: false,
    });
    expect(result).toMatchObject({ status: "accepted" });
    expect(result.cases.map((c) => c.status)).toEqual(["passed", "passed"]);
  });

  it("catches the classic NULL-group bug as a wrong answer", async () => {
    const result = await gradeSubmission({
      userSql: "SELECT dept, max(salary) FROM employees WHERE dept IS NOT NULL GROUP BY dept",
      referenceSql: reference,
      schemaSql,
      testCases,
      orderMatters: false,
    });
    expect(result.status).toBe("wrong_answer");
    expect(result.cases[0]).toMatchObject({ status: "failed", message: "Expected 3 rows, got 2." });
  });
});

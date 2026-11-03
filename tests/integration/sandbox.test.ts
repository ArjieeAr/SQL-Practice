/**
 * Runs real worker threads with a real PGlite. Slower than the unit tests (each case boots a
 * WASM Postgres), but this is what proves the sandbox's safety properties actually hold.
 */
import { describe, expect, it } from "vitest";

import { gradeSubmission } from "@/lib/grader/grade";
import { verifyProblem } from "@/lib/problems/verify";
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

describe("verifyProblem", () => {
  const problem = {
    slug: "top-salary",
    schemaSql,
    sampleDataSql: dataSql,
    solutionSql: reference,
    orderMatters: false,
    cases: [
      { name: "ties and NULL dept", sql: dataSql },
      { name: "empty table", sql: "" },
    ],
    pitfalls: [],
  };
  // Keeps generating rows until the worker is killed, unlike a query that would eventually finish.
  const RUNAWAY = "SELECT count(*) FROM generate_series(1, 10000000000)";

  it("reports expected results, the sample tables, and which case catches each pitfall", async () => {
    const verification = await verifyProblem({
      ...problem,
      pitfalls: [
        {
          name: "drops NULL dept",
          sql: "SELECT dept, max(salary) FROM employees WHERE dept IS NOT NULL GROUP BY dept",
        },
        { name: "actually correct", sql: reference },
      ],
    });
    expect(verification.sampleExpected.rows).toHaveLength(3);
    expect(verification.sampleTables.map((table) => table.name)).toEqual(["employees"]);
    expect(verification.sampleTables[0].columns[0]).toMatchObject({
      name: "id",
      primaryKey: true,
    });
    expect(verification.cases.map((c) => c.name)).toEqual(["ties and NULL dept", "empty table"]);
    expect(verification.pitfalls).toEqual([
      { name: "drops NULL dept", caughtBy: "ties and NULL dept" },
      { name: "actually correct", caughtBy: null },
    ]);
  });

  it("explains broken SQL in each part of a problem", async () => {
    await expect(verifyProblem({ ...problem, schemaSql: "CREATE TABLE oops (" })).rejects.toThrow(
      /sample data failed to load/,
    );
    await expect(verifyProblem({ ...problem, solutionSql: "SELECT nope" })).rejects.toThrow(
      /reference failed on sample data/,
    );
    await expect(
      verifyProblem({
        ...problem,
        cases: [{ name: "bad data", sql: "INSERT INTO nope VALUES (1)" }],
      }),
    ).rejects.toThrow(/case "bad data" failed to load/);
    await expect(
      verifyProblem({ ...problem, pitfalls: [{ name: "typo", sql: "SELECT nope" }] }),
    ).rejects.toThrow(/pitfall "typo" errors on the sample data/);
  });

  it("refuses a statement that isn't a read query as the reference", async () => {
    await expect(
      verifyProblem({ ...problem, solutionSql: "DELETE FROM employees" }),
    ).rejects.toThrow(/reference failed/);
  });

  it("kills a runaway reference without blocking this thread", async () => {
    const tick = setInterval(() => (ticks += 1), 50);
    let ticks = 0;
    try {
      await expect(
        verifyProblem({ ...problem, solutionSql: RUNAWAY }, { queryTimeoutMs: 500 }),
      ).rejects.toThrow(/took too long/);
    } finally {
      clearInterval(tick);
    }
    // In-thread, PGlite would have blocked the event loop, so these timers could never have fired.
    expect(ticks).toBeGreaterThan(5);
  });

  it("kills runaway setup SQL, which can come from a user's proposal", async () => {
    const tick = setInterval(() => (ticks += 1), 50);
    let ticks = 0;
    try {
      await expect(
        verifyProblem(
          {
            ...problem,
            sampleDataSql: `INSERT INTO employees (id, name) SELECT g, 'x' FROM generate_series(1, 10000000000) g;`,
          },
          { bootTimeoutMs: 3_000 },
        ),
      ).rejects.toThrow(/took too long/);
    } finally {
      clearInterval(tick);
    }
    expect(ticks).toBeGreaterThan(5);
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

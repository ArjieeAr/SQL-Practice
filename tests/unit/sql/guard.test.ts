import { describe, expect, it } from "vitest";

import { checkUserQuery } from "@/lib/sql/guard";
import { LIMITS } from "@/lib/sql/limits";

describe("checkUserQuery", () => {
  it.each([
    "SELECT 1",
    "select * from t;",
    "WITH x AS (SELECT 1) SELECT * FROM x",
    "VALUES (1), (2)",
    "TABLE employees",
    "(SELECT 1) UNION (SELECT 2)",
    "-- find top earners\nSELECT 1",
    "/* comment */ select 1",
  ])("accepts %j", (sql) => {
    expect(checkUserQuery(sql)).toEqual({ ok: true });
  });

  it.each(["DELETE FROM t", "drop table t", "insert into t values (1)", "SET x = 1", "selectx"])(
    "rejects %j",
    (sql) => {
      expect(checkUserQuery(sql)).toMatchObject({ ok: false });
    },
  );

  it("rejects empty and comment-only input", () => {
    expect(checkUserQuery("   ")).toMatchObject({ ok: false, message: "Write a query first." });
    expect(checkUserQuery("-- nothing here")).toMatchObject({ ok: false });
  });

  it("rejects queries over the length limit", () => {
    const long = `SELECT '${"x".repeat(LIMITS.maxQueryLength)}'`;
    expect(checkUserQuery(long)).toMatchObject({ ok: false });
  });
});

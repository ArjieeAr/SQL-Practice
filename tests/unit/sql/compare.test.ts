import { describe, expect, it } from "vitest";

import { compareResults } from "@/lib/sql/compare";
import type { RawResult, RawValue } from "@/lib/sql/types";

const TEXT = 25;
const INT4 = 23;
const NUMERIC = 1700;

/** Build a result from column specs like ["name:text", "total:int"] and rows. */
function result(columns: string[], rows: RawValue[][]): RawResult {
  const types: Record<string, number> = { text: TEXT, int: INT4, numeric: NUMERIC };
  return {
    columns: columns.map((spec) => {
      const [name, type] = spec.split(":");
      return { name, typeId: types[type] };
    }),
    rows,
    truncated: false,
  };
}

const unordered = { orderMatters: false };
const ordered = { orderMatters: true };

describe("compareResults", () => {
  const expected = result(
    ["name:text", "total:int"],
    [
      ["alice", "30"],
      ["bob", "20"],
      ["carol", "20"],
    ],
  );

  it("accepts identical results", () => {
    expect(compareResults(expected, expected, ordered)).toEqual({ equal: true });
  });

  it("ignores row order when order does not matter", () => {
    const shuffled = result(
      ["name:text", "total:int"],
      [
        ["carol", "20"],
        ["alice", "30"],
        ["bob", "20"],
      ],
    );
    expect(compareResults(expected, shuffled, unordered)).toEqual({ equal: true });
  });

  it("reports a row_order failure when order matters and only the order differs", () => {
    const shuffled = result(
      ["name:text", "total:int"],
      [
        ["bob", "20"],
        ["alice", "30"],
        ["carol", "20"],
      ],
    );
    expect(compareResults(expected, shuffled, ordered)).toMatchObject({
      equal: false,
      reason: "row_order",
    });
  });

  it("ignores column names (aliases are the user's choice)", () => {
    const renamed = result(["employee:text", "sum:int"], expected.rows);
    expect(compareResults(expected, renamed, ordered)).toEqual({ equal: true });
  });

  it("does not ignore column order", () => {
    const swapped = result(
      ["total:int", "name:text"],
      expected.rows.map(([a, b]) => [b, a]),
    );
    expect(compareResults(expected, swapped, unordered)).toMatchObject({
      equal: false,
      reason: "values",
    });
  });

  it("matches numbers across numeric types", () => {
    const asNumeric = result(
      ["name:text", "total:numeric"],
      [
        ["alice", "30.00"],
        ["bob", "20.0"],
        ["carol", "20"],
      ],
    );
    expect(compareResults(expected, asNumeric, ordered)).toEqual({ equal: true });
  });

  it("reports a column count mismatch", () => {
    const extra = result(
      ["name:text", "total:int", "x:int"],
      expected.rows.map((r) => [...r, "1"]),
    );
    expect(compareResults(expected, extra, unordered)).toMatchObject({
      equal: false,
      reason: "column_count",
      message: "Expected 2 columns, got 3.",
    });
  });

  it("reports a row count mismatch", () => {
    const fewer = result(["name:text", "total:int"], expected.rows.slice(0, 2));
    expect(compareResults(expected, fewer, unordered)).toMatchObject({
      equal: false,
      reason: "row_count",
      message: "Expected 3 rows, got 2.",
    });
  });

  it("treats duplicate rows as significant (multiset, not set)", () => {
    const a = result(["n:int"], [["1"], ["1"], ["2"]]);
    const b = result(["n:int"], [["1"], ["2"], ["2"]]);
    expect(compareResults(a, b, unordered)).toMatchObject({ equal: false, reason: "values" });
  });

  describe("NULL handling", () => {
    it("matches NULLs in the same position", () => {
      const a = result(["name:text", "manager:text"], [["alice", null]]);
      expect(compareResults(a, a, unordered)).toEqual({ equal: true });
    });

    it("does not treat NULL as the empty string or the text 'null'", () => {
      const withNull = result(["v:text"], [[null]]);
      expect(compareResults(withNull, result(["v:text"], [[""]]), unordered).equal).toBe(false);
      expect(compareResults(withNull, result(["v:text"], [["null"]]), unordered).equal).toBe(false);
    });

    it("sorts NULLs consistently when ignoring row order", () => {
      const a = result(["v:int"], [[null], ["1"], [null]]);
      const b = result(["v:int"], [["1"], [null], [null]]);
      expect(compareResults(a, b, unordered)).toEqual({ equal: true });
    });
  });

  describe("empty results", () => {
    it("accepts two empty results with the same columns", () => {
      const a = result(["name:text"], []);
      expect(compareResults(a, a, ordered)).toEqual({ equal: true });
    });

    it("rejects an empty result when rows were expected", () => {
      const empty = result(["name:text", "total:int"], []);
      expect(compareResults(expected, empty, unordered)).toMatchObject({ reason: "row_count" });
    });

    it("still checks column count on empty results", () => {
      const a = result(["name:text"], []);
      const b = result(["name:text", "x:int"], []);
      expect(compareResults(a, b, unordered)).toMatchObject({ reason: "column_count" });
    });
  });
});

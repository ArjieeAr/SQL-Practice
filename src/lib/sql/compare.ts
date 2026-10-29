import { normalizeRows } from "./normalize";
import type { CompareOutcome, RawResult } from "./types";

export interface CompareOptions {
  /** When false (the default for most problems), rows are compared as a multiset. */
  orderMatters: boolean;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Decide whether the user's result matches the reference result.
 *
 * Columns are matched by position, not name, so `SELECT name AS employee` is fine. Values are
 * normalized first (see normalize.ts). The messages never reveal expected values, because
 * test-case data is hidden from the user.
 */
export function compareResults(
  expected: RawResult,
  actual: RawResult,
  { orderMatters }: CompareOptions,
): CompareOutcome {
  if (expected.columns.length !== actual.columns.length) {
    return {
      equal: false,
      reason: "column_count",
      message: `Expected ${plural(expected.columns.length, "column")}, got ${actual.columns.length}.`,
    };
  }

  if (expected.rows.length !== actual.rows.length) {
    return {
      equal: false,
      reason: "row_count",
      message: `Expected ${plural(expected.rows.length, "row")}, got ${actual.rows.length}.`,
    };
  }

  // One string per row makes rows hashable and sortable; JSON keeps null distinct from "null".
  const expectedKeys = normalizeRows(expected).map((row) => JSON.stringify(row));
  const actualKeys = normalizeRows(actual).map((row) => JSON.stringify(row));

  if (orderMatters && expectedKeys.every((key, i) => key === actualKeys[i])) {
    return { equal: true };
  }

  // Sorting both sides turns a multiset comparison into a sequence comparison.
  expectedKeys.sort();
  actualKeys.sort();
  const sameMultiset = expectedKeys.every((key, i) => key === actualKeys[i]);

  if (sameMultiset && !orderMatters) return { equal: true };
  if (sameMultiset) {
    return {
      equal: false,
      reason: "row_order",
      message: "The rows are correct but not in the required order.",
    };
  }
  return {
    equal: false,
    reason: "values",
    message: "The result has the right shape, but some values are different.",
  };
}

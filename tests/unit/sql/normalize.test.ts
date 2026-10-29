import { describe, expect, it } from "vitest";

import { canonicalNumber, normalizeValue } from "@/lib/sql/normalize";

const INT4 = 23;
const INT8 = 20;
const FLOAT8 = 701;
const NUMERIC = 1700;
const TEXT = 25;
const BOOL = 16;
const BPCHAR = 1042;
const JSONB = 3802;
const JSON_OID = 114;
const INT4_ARRAY = 1007;

describe("canonicalNumber", () => {
  it.each([
    ["2.50", "2.5"],
    ["2.5", "2.5"],
    ["0.30000000000000004", "0.3"],
    ["007", "7"],
    ["-0", "0"],
    ["-0.0000001", "0"],
    ["1e+20", "100000000000000000000"],
    ["NaN", "NaN"],
    ["Infinity", "Infinity"],
  ])("%s -> %s", (input, expected) => {
    expect(canonicalNumber(input)).toBe(expected);
  });

  it("keeps full precision for integers beyond 2^53", () => {
    expect(canonicalNumber("9007199254740993")).toBe("9007199254740993");
  });

  it("rounds to 6 decimal places", () => {
    expect(canonicalNumber("1.23456749")).toBe("1.234567");
    expect(canonicalNumber("1.2345675")).toBe("1.234568");
  });
});

describe("normalizeValue", () => {
  it("treats numeric, float and int forms of the same number as equal", () => {
    const forms = [
      normalizeValue("3", INT4),
      normalizeValue("3.00", NUMERIC),
      normalizeValue("3", FLOAT8),
      normalizeValue("3", INT8),
    ];
    expect(new Set(forms).size).toBe(1);
  });

  it("does not treat the text '3' as the number 3", () => {
    expect(normalizeValue("3", TEXT)).not.toBe(normalizeValue("3", INT4));
  });

  it("keeps NULL distinct from the text 'null' and the empty string", () => {
    expect(normalizeValue(null, TEXT)).toBeNull();
    expect(normalizeValue("null", TEXT)).not.toBeNull();
    expect(normalizeValue("", TEXT)).not.toBeNull();
  });

  it("ignores char(n) padding", () => {
    expect(normalizeValue("ab  ", BPCHAR)).toBe(normalizeValue("ab", TEXT));
  });

  it("canonicalizes JSON key order and whitespace", () => {
    expect(normalizeValue('{"b": 1, "a": [1, 2]}', JSON_OID)).toBe(
      normalizeValue('{"a":[1,2],"b":1}', JSONB),
    );
  });

  it("normalizes array elements using the element type", () => {
    expect(normalizeValue(["1.0", null], INT4_ARRAY)).toBe(normalizeValue(["1", null], INT4_ARRAY));
    expect(normalizeValue(["1", "2"], INT4_ARRAY)).not.toBe(normalizeValue(["2", "1"], INT4_ARRAY));
  });

  it("tags booleans", () => {
    expect(normalizeValue("t", BOOL)).toBe("b:t");
  });
});

import type { NormalizedCell, RawResult, RawValue } from "./types";

/** Postgres type OIDs we treat specially. */
const OID = {
  bool: 16,
  int8: 20,
  int2: 21,
  int4: 23,
  oid: 26,
  json: 114,
  float4: 700,
  float8: 701,
  bpchar: 1042,
  numeric: 1700,
  jsonb: 3802,
} as const;

const NUMERIC_TYPES = new Set<number>([
  OID.int2,
  OID.int4,
  OID.int8,
  OID.oid,
  OID.float4,
  OID.float8,
  OID.numeric,
]);

/** Array type OID -> element type OID, so array elements get the same treatment as scalars. */
const ARRAY_ELEMENT_TYPES: Record<number, number> = {
  1000: OID.bool,
  1005: OID.int2,
  1007: OID.int4,
  1016: OID.int8,
  1021: OID.float4,
  1022: OID.float8,
  1231: OID.numeric,
  1014: OID.bpchar,
  199: OID.json,
  3807: OID.jsonb,
};

/** Decimal places kept when comparing non-integer numbers (absorbs float noise). */
const DECIMAL_PLACES = 6;
const SCALE = 10 ** DECIMAL_PLACES;

/**
 * Canonical text for a number so that 2.50 (numeric), 2.5 (float8) and 2.500000001 compare equal,
 * and integers of any size keep full precision.
 */
export function canonicalNumber(text: string): string {
  if (/^-?\d+$/.test(text)) return BigInt(text).toString(); // drops leading zeros and "-0"

  const n = Number(text);
  if (!Number.isFinite(n)) return text; // NaN, Infinity, -Infinity
  // Past ~1e15 a double has no fractional precision left, and scaling could overflow.
  if (Math.abs(n) >= 1e15) return String(n);

  const rounded = Math.round(n * SCALE) / SCALE;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

/** Stable JSON text: object keys sorted, insignificant whitespace removed. */
function canonicalJson(text: string): string {
  const sortKeys = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, v]) => [k, sortKeys(v)]),
      );
    }
    return value;
  };
  try {
    return JSON.stringify(sortKeys(JSON.parse(text)));
  } catch {
    return text;
  }
}

/**
 * Turn one raw Postgres value into a comparable string. Numbers and booleans get a type tag
 * so the text '1' and the integer 1 are not considered equal; everything else compares as text.
 */
export function normalizeValue(value: RawValue, typeId: number): NormalizedCell {
  if (value === null) return null;

  if (Array.isArray(value)) {
    const elementType = ARRAY_ELEMENT_TYPES[typeId] ?? 0;
    return `a:${JSON.stringify(value.map((v) => normalizeValue(v, elementType)))}`;
  }

  if (NUMERIC_TYPES.has(typeId)) return `n:${canonicalNumber(value)}`;
  if (typeId === OID.bool) return `b:${value}`;
  // char(n) is blank-padded; Postgres itself ignores trailing spaces when comparing it.
  if (typeId === OID.bpchar) return `s:${value.trimEnd()}`;
  if (typeId === OID.json || typeId === OID.jsonb) return `s:${canonicalJson(value)}`;
  return `s:${value}`;
}

export function normalizeRows(result: RawResult): NormalizedCell[][] {
  return result.rows.map((row) =>
    row.map((value, i) => normalizeValue(value, result.columns[i]?.typeId ?? 0)),
  );
}

/**
 * A value exactly as Postgres printed it. The sandbox disables PGlite's JS type parsing,
 * so scalars arrive as text and arrays as (nested) arrays of text.
 */
export type RawValue = string | null | RawValue[];

export interface ColumnInfo {
  name: string;
  /** Postgres type OID, used to normalize values (e.g. numeric vs text). */
  typeId: number;
}

/** What the sandbox returns for one query. */
export interface RawResult {
  columns: ColumnInfo[];
  rows: RawValue[][];
  /** True when the query produced more rows than the sandbox fetched. */
  truncated: boolean;
}

/** A value in canonical, comparable form: a type tag plus text, e.g. "n:2.5". */
export type NormalizedCell = string | null;

export type CompareOutcome =
  | { equal: true }
  | {
      equal: false;
      reason: "column_count" | "row_count" | "row_order" | "values";
      message: string;
    };

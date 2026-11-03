import type { SampleTable } from "@/lib/problems/preview";
import type { RawResult } from "@/lib/sql/types";

/** Everything the grading worker needs to run one test case. Passed as `workerData`. */
export interface CaseJob {
  /** Problem schema followed by the test case's data. */
  setupSql: string;
  referenceSql: string;
  userSql: string;
  maxRows: number;
}

export interface CaseWorkerData {
  job: CaseJob;
  /** Initialized empty cluster to boot from; when absent the worker runs initdb itself. */
  snapshot?: SharedArrayBuffer;
}

/** Messages the worker posts back to the parent thread. */
export type WorkerMessage =
  /** Sandbox booted and data loaded; the parent starts the query timeout now. */
  | { type: "ready" }
  | { type: "completed"; expected: RawResult; actual: RawResult; runtimeMs: number }
  | { type: "user_error"; message: string; position?: number }
  /** Our fault (bad seed data, broken reference solution), not the user's. */
  | { type: "internal_error"; message: string };

/** The outcome of running one test case, as seen by the grader. */
export type CaseRun = Exclude<WorkerMessage, { type: "ready" }> | { type: "timeout" };

/** One dataset of a problem being verified: its reference and known-wrong queries run on it. */
export interface DatasetJob {
  /** Problem schema followed by the sample or test case data. */
  setupSql: string;
  referenceSql: string;
  pitfallSqls: string[];
  maxRows: number;
  /** Also describe the loaded tables, for the schema viewer. */
  withTables: boolean;
}

export interface DatasetWorkerData {
  job: DatasetJob;
  snapshot?: SharedArrayBuffer;
}

/** A pitfall should run and return wrong rows; an error is still recorded as an outcome. */
export type PitfallRun = { result: RawResult } | { error: string };

/** Messages the verification worker posts back to the parent thread. */
export type DatasetMessage =
  | { type: "ready" }
  | { type: "completed"; expected: RawResult; pitfalls: PitfallRun[]; tables: SampleTable[] }
  | { type: "setup_error"; message: string }
  | { type: "reference_error"; message: string }
  | { type: "internal_error"; message: string };

export type DatasetRun = Exclude<DatasetMessage, { type: "ready" }> | { type: "timeout" };

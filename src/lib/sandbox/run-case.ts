import path from "node:path";
import { Worker } from "node:worker_threads";

import { LIMITS } from "@/lib/sql/limits";

import type {
  CaseJob,
  CaseRun,
  CaseWorkerData,
  DatasetJob,
  DatasetMessage,
  DatasetRun,
  DatasetWorkerData,
  WorkerMessage,
} from "./protocol";

/**
 * Worker entry points. In `next build`, Turbopack recognizes `new Worker(path)` and emits each
 * worker as its own server chunk, which is why each `new Worker` below names its constant
 * directly; in tests, Node loads the .mjs files directly.
 */
const SANDBOX_DIR = path.join(process.cwd(), "src", "lib", "sandbox");
const GRADE_WORKER = path.join(SANDBOX_DIR, "grade-worker.mjs");
const VERIFY_WORKER = path.join(SANDBOX_DIR, "verify-worker.mjs");
const SNAPSHOT_WORKER = path.join(SANDBOX_DIR, "snapshot-worker.mjs");

const SNAPSHOT_TIMEOUT_MS = 30_000;

let snapshotPromise: Promise<SharedArrayBuffer | undefined> | undefined;

/**
 * An initialized, empty Postgres cluster, built once per server process and shared by every case
 * worker. Restoring it skips initdb and cuts each case's boot from ~2s to ~0.3s.
 *
 * It's an optimization only: if building it fails, workers fall back to a cold boot.
 */
export function getBaseSnapshot(): Promise<SharedArrayBuffer | undefined> {
  snapshotPromise ??= new Promise<SharedArrayBuffer | undefined>((resolve) => {
    const worker = new Worker(SNAPSHOT_WORKER);
    let settled = false;
    const done = (snapshot?: SharedArrayBuffer) => {
      // terminate() below fires "exit"; without this guard it would wipe the cached snapshot.
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      if (!snapshot) snapshotPromise = undefined; // retry on the next submission
      resolve(snapshot);
    };
    const timer = setTimeout(() => done(), SNAPSHOT_TIMEOUT_MS);
    worker.once("message", (snapshot: SharedArrayBuffer) => done(snapshot));
    worker.once("error", () => done());
    worker.once("exit", () => done());
  });
  return snapshotPromise;
}

export interface RunCaseOptions {
  queryTimeoutMs?: number;
  bootTimeoutMs?: number;
}

interface Supervision<Run> {
  bootTimeoutMs: number;
  queryTimeoutMs: number;
  bootTimedOut: Run;
  queryTimedOut: Run;
  /** Whether the worker had reported "ready" tells us what the crash can be blamed on. */
  crashed: (ready: boolean, detail: string) => Run;
}

/**
 * Enforce two budgets on a worker running in a fresh PGlite: a boot budget (start WASM Postgres +
 * load data) and a query budget that starts only once the worker reports "ready", so cold-start
 * time never counts against the queries.
 */
function superviseWorker<Message extends { type: string }, Run>(
  worker: Worker,
  { bootTimeoutMs, queryTimeoutMs, bootTimedOut, queryTimedOut, crashed }: Supervision<Run>,
): Promise<Run> {
  return new Promise((resolve) => {
    let ready = false;
    let settled = false;

    const finish = (run: Run) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Kills the thread even if it is stuck inside a WASM call.
      void worker.terminate();
      resolve(run);
    };

    let timer = setTimeout(() => finish(bootTimedOut), bootTimeoutMs);

    worker.on("message", (message: Message) => {
      if (message.type === "ready") {
        ready = true;
        clearTimeout(timer);
        timer = setTimeout(() => finish(queryTimedOut), queryTimeoutMs);
        return;
      }
      // Every message other than "ready" is final, and is one of the worker's Run variants.
      finish(message as unknown as Run);
    });

    worker.on("error", (err) => finish(crashed(ready, err.message)));
    worker.on("exit", (code) => finish(crashed(ready, `exit code ${code}`)));
  });
}

/** Run one test case in a fresh worker thread with a fresh PGlite. */
export async function runCaseInWorker(
  job: CaseJob,
  {
    queryTimeoutMs = LIMITS.queryTimeoutMs,
    bootTimeoutMs = LIMITS.bootTimeoutMs,
  }: RunCaseOptions = {},
): Promise<CaseRun> {
  const workerData: CaseWorkerData = { job, snapshot: await getBaseSnapshot() };

  return superviseWorker<WorkerMessage, CaseRun>(new Worker(GRADE_WORKER, { workerData }), {
    bootTimeoutMs,
    queryTimeoutMs,
    bootTimedOut: { type: "internal_error", message: "The sandbox took too long to start." },
    queryTimedOut: { type: "timeout" },
    // A crash after the data loaded can only come from running the queries.
    crashed: (ready, detail) =>
      ready
        ? { type: "user_error", message: "Your query crashed the sandbox." }
        : { type: "internal_error", message: `The sandbox crashed while starting: ${detail}` },
  });
}

/**
 * Run a problem's reference and pitfalls on one dataset in a fresh worker thread. By default each
 * query gets the same budget a user's query does, and a timeout in setup counts as a timeout too:
 * the setup SQL may itself be untrusted here, unlike when grading.
 */
export async function runDatasetInWorker(
  job: DatasetJob,
  {
    queryTimeoutMs = LIMITS.queryTimeoutMs *
      (1 + job.pitfallSqls.length + (job.withTables ? 1 : 0)),
    bootTimeoutMs = LIMITS.bootTimeoutMs,
  }: RunCaseOptions = {},
): Promise<DatasetRun> {
  const workerData: DatasetWorkerData = { job, snapshot: await getBaseSnapshot() };

  return superviseWorker<DatasetMessage, DatasetRun>(new Worker(VERIFY_WORKER, { workerData }), {
    bootTimeoutMs,
    queryTimeoutMs,
    bootTimedOut: { type: "timeout" },
    queryTimedOut: { type: "timeout" },
    crashed: (_ready, detail) => ({
      type: "internal_error",
      message: `The sandbox crashed: ${detail}`,
    }),
  });
}

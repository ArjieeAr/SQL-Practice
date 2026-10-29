import path from "node:path";
import { Worker } from "node:worker_threads";

import { LIMITS } from "@/lib/sql/limits";

import type { CaseJob, CaseRun, CaseWorkerData, WorkerMessage } from "./protocol";

/**
 * Worker entry points. In `next build`, Turbopack recognizes `new Worker(path)` and emits each
 * worker as its own server chunk; in tests, Node loads the .mjs files directly.
 */
const SANDBOX_DIR = path.join(process.cwd(), "src", "lib", "sandbox");
const GRADE_WORKER = path.join(SANDBOX_DIR, "grade-worker.mjs");
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

/**
 * Run one test case in a fresh worker thread with a fresh PGlite, enforcing two budgets:
 * a boot budget (start WASM Postgres + load data) and a query budget that starts only once the
 * worker reports "ready", so cold-start time never counts against the user's query.
 */
export async function runCaseInWorker(
  job: CaseJob,
  {
    queryTimeoutMs = LIMITS.queryTimeoutMs,
    bootTimeoutMs = LIMITS.bootTimeoutMs,
  }: RunCaseOptions = {},
): Promise<CaseRun> {
  const workerData: CaseWorkerData = { job, snapshot: await getBaseSnapshot() };

  return new Promise((resolve) => {
    const worker = new Worker(GRADE_WORKER, { workerData });
    let ready = false;
    let settled = false;

    const finish = (run: CaseRun) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Kills the thread even if it is stuck inside a WASM call.
      void worker.terminate();
      resolve(run);
    };

    let timer = setTimeout(
      () => finish({ type: "internal_error", message: "The sandbox took too long to start." }),
      bootTimeoutMs,
    );

    worker.on("message", (message: WorkerMessage) => {
      if (message.type === "ready") {
        ready = true;
        clearTimeout(timer);
        timer = setTimeout(() => finish({ type: "timeout" }), queryTimeoutMs);
        return;
      }
      finish(message);
    });

    // A crash after the data loaded can only come from running the queries.
    const crashed = (detail: string) =>
      finish(
        ready
          ? { type: "user_error", message: "Your query crashed the sandbox." }
          : { type: "internal_error", message: `The sandbox crashed while starting: ${detail}` },
      );
    worker.on("error", (err) => crashed(err.message));
    worker.on("exit", (code) => crashed(`exit code ${code}`));
  });
}

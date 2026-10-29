// @ts-check
/**
 * Worker thread that runs one test case. It lives in its own thread so the parent can kill it
 * with worker.terminate(): PGlite executes queries synchronously inside WASM, so a runaway query
 * blocks its thread's event loop and no in-thread timer (or Postgres statement_timeout) can fire.
 *
 * The parent terminates this worker as soon as it receives a final message.
 */
import { parentPort, workerData } from "node:worker_threads";

import { createSandbox, runReadOnlyQuery, SandboxQueryError } from "./engine.mjs";

/** @typedef {import("./protocol").CaseWorkerData} CaseWorkerData */
/** @typedef {import("./protocol").WorkerMessage} WorkerMessage */

const port = /** @type {import("node:worker_threads").MessagePort} */ (parentPort);
/** @param {WorkerMessage} message */
const post = (message) => port.postMessage(message);
const errorMessage = (/** @type {unknown} */ err) =>
  err instanceof Error ? err.message : String(err);

/** @param {CaseWorkerData} data */
async function runCase({ job, snapshot }) {
  let db;
  try {
    db = await createSandbox(job.setupSql, snapshot);
  } catch (err) {
    return post({
      type: "internal_error",
      message: `Failed to load test data: ${errorMessage(err)}`,
    });
  }
  post({ type: "ready" });

  // The reference runs first, so nothing the user's query does can affect the expected output.
  let expected;
  try {
    expected = await runReadOnlyQuery(db, job.referenceSql, job.maxRows);
  } catch (err) {
    return post({
      type: "internal_error",
      message: `Reference solution failed: ${errorMessage(err)}`,
    });
  }

  const start = performance.now();
  try {
    const actual = await runReadOnlyQuery(db, job.userSql, job.maxRows);
    const runtimeMs = Math.round(performance.now() - start);
    post({ type: "completed", expected, actual, runtimeMs });
  } catch (err) {
    if (err instanceof SandboxQueryError) {
      post({ type: "user_error", message: err.message, position: err.position });
    } else {
      post({ type: "internal_error", message: errorMessage(err) });
    }
  }
}

await runCase(/** @type {CaseWorkerData} */ (workerData));

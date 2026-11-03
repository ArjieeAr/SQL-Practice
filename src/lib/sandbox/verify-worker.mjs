// @ts-check
/**
 * Worker thread that runs one dataset of a problem being verified: load the schema and data, then
 * run the reference and every pitfall. Admins verify SQL that users proposed, so this needs the
 * same protection as grading: the parent can kill this thread if anything runs away.
 *
 * The parent terminates this worker as soon as it receives a final message.
 */
import { parentPort, workerData } from "node:worker_threads";

import { createSandbox, runReadOnlyQuery, SandboxQueryError } from "./engine.mjs";
import { introspectTables } from "./introspect.mjs";

/** @typedef {import("./protocol").DatasetWorkerData} DatasetWorkerData */
/** @typedef {import("./protocol").DatasetMessage} DatasetMessage */
/** @typedef {import("./protocol").PitfallRun} PitfallRun */

const port = /** @type {import("node:worker_threads").MessagePort} */ (parentPort);
/** @param {DatasetMessage} message */
const post = (message) => port.postMessage(message);
const errorMessage = (/** @type {unknown} */ err) =>
  err instanceof Error ? err.message : String(err);

/** @param {DatasetWorkerData} data */
async function runDataset({ job, snapshot }) {
  let db;
  try {
    db = await createSandbox(job.setupSql, snapshot);
  } catch (err) {
    return post({ type: "setup_error", message: errorMessage(err) });
  }
  post({ type: "ready" });

  let expected;
  try {
    expected = await runReadOnlyQuery(db, job.referenceSql, job.maxRows);
  } catch (err) {
    return post({ type: "reference_error", message: errorMessage(err) });
  }

  try {
    // One at a time: each query opens a transaction and a cursor on this single connection, so
    // running them concurrently would interleave and fail for reasons unrelated to the SQL.
    /** @type {PitfallRun[]} */
    const pitfalls = [];
    for (const sql of job.pitfallSqls) {
      try {
        pitfalls.push({ result: await runReadOnlyQuery(db, sql, job.maxRows) });
      } catch (err) {
        if (!(err instanceof SandboxQueryError)) throw err;
        pitfalls.push({ error: err.message });
      }
    }
    const tables = job.withTables ? await introspectTables(db, job.maxRows) : [];
    post({ type: "completed", expected, pitfalls, tables });
  } catch (err) {
    post({ type: "internal_error", message: errorMessage(err) });
  }
}

await runDataset(/** @type {DatasetWorkerData} */ (workerData));

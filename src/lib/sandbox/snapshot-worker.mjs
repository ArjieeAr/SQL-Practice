// @ts-check
/**
 * Runs initdb once, off the main thread, and hands back the empty cluster as a SharedArrayBuffer.
 * See getBaseSnapshot() in run-case.ts.
 */
import { parentPort } from "node:worker_threads";

import { createSnapshot } from "./engine.mjs";

const port = /** @type {import("node:worker_threads").MessagePort} */ (parentPort);
port.postMessage(await createSnapshot());

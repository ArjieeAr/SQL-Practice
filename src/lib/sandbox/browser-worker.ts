/// <reference lib="webworker" />
/**
 * Web Worker that runs "Run" queries in the browser. It holds one PGlite loaded with the
 * problem's schema + sample data and reuses it for every query: runReadOnlyQuery executes
 * read-only and rolls back, so queries can't change the data for the next run.
 *
 * Living in a worker means a runaway query blocks this thread, not the page, and the page can
 * kill it with worker.terminate() (see browser-sandbox.ts).
 */
import type { PGlite } from "@electric-sql/pglite";

import type { BrowserRequest, BrowserResponse } from "./browser-protocol";
import { createSandbox, runReadOnlyQuery, SandboxQueryError } from "./engine.mjs";

declare const self: DedicatedWorkerGlobalScope;

let db: PGlite | null = null;
const post = (message: BrowserResponse) => self.postMessage(message);
const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

self.onmessage = async ({ data: request }: MessageEvent<BrowserRequest>) => {
  if (request.type === "load") {
    try {
      await db?.close();
      db = await createSandbox(request.setupSql);
      post({ id: request.id, type: "loaded" });
    } catch (err) {
      post({ id: request.id, type: "load_error", message: errorMessage(err) });
    }
    return;
  }

  if (!db) {
    post({ id: request.id, type: "query_error", message: "The database is not loaded yet." });
    return;
  }
  const start = performance.now();
  try {
    const result = await runReadOnlyQuery(db, request.sql, request.maxRows);
    post({
      id: request.id,
      type: "result",
      result,
      runtimeMs: Math.round(performance.now() - start),
    });
  } catch (err) {
    post({
      id: request.id,
      type: "query_error",
      message: errorMessage(err),
      position: err instanceof SandboxQueryError ? err.position : undefined,
    });
  }
};

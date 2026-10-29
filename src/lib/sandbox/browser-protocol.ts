import type { RawResult } from "@/lib/sql/types";

/** Messages from the page to the browser sandbox worker. */
export type BrowserRequest =
  | { id: number; type: "load"; setupSql: string }
  | { id: number; type: "run"; sql: string; maxRows: number };

/** Messages from the worker back to the page. `id` matches the request it answers. */
export type BrowserResponse =
  | { id: number; type: "loaded" }
  | { id: number; type: "load_error"; message: string }
  | { id: number; type: "result"; result: RawResult; runtimeMs: number }
  | { id: number; type: "query_error"; message: string; position?: number };

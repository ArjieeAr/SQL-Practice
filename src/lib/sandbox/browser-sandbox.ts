import { checkUserQuery } from "@/lib/sql/guard";
import { LIMITS } from "@/lib/sql/limits";
import type { RawResult } from "@/lib/sql/types";

import type { BrowserRequest, BrowserResponse } from "./browser-protocol";

/** Omit that distributes over a union (plain Omit would merge the variants). */
type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

export type SandboxStatus = "idle" | "booting" | "ready" | "running" | "failed";

export type RunOutcome =
  | { type: "result"; result: RawResult; runtimeMs: number }
  | { type: "error"; message: string; position?: number }
  | { type: "timeout" };

/**
 * Owns the browser sandbox worker for one problem: boots it, sends queries, and enforces the
 * same time limit as the grader. On timeout the worker is killed (the only way to stop a query
 * stuck in WASM) and transparently rebooted on the next run.
 */
export class BrowserSandbox {
  private worker: Worker | null = null;
  private loading: Promise<void> | null = null;
  private nextId = 1;
  private pending = new Map<number, (response: BrowserResponse) => void>();
  private disposed = false;

  constructor(
    private readonly setupSql: string,
    private readonly reportStatus: (status: SandboxStatus) => void,
  ) {}

  /**
   * A disposed sandbox stays silent: React dev mode mounts twice, and the first instance's
   * cancelled boot must not overwrite the status of the one that replaced it.
   */
  private onStatus(status: SandboxStatus) {
    if (!this.disposed) this.reportStatus(status);
  }

  /** Boot the worker and load the sample data. Safe to call repeatedly. */
  start(): Promise<void> {
    if (this.loading) return this.loading;

    this.onStatus("booting");
    const worker = new Worker(new URL("./browser-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }: MessageEvent<BrowserResponse>) => {
      this.pending.get(data.id)?.(data);
      this.pending.delete(data.id);
    };
    this.worker = worker;

    this.loading = this.request({ type: "load", setupSql: this.setupSql }).then((response) => {
      if (response.type !== "loaded") {
        this.onStatus("failed");
        throw new Error(response.type === "load_error" ? response.message : "Failed to load");
      }
      this.onStatus("ready");
    });
    // Let the next start() retry after a failed boot.
    this.loading.catch(() => this.kill());
    return this.loading;
  }

  async run(sql: string): Promise<RunOutcome> {
    const guard = checkUserQuery(sql);
    if (!guard.ok) return { type: "error", message: guard.message };

    try {
      await this.start();
    } catch (err) {
      return { type: "error", message: `Could not start the database: ${(err as Error).message}` };
    }

    this.onStatus("running");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), LIMITS.queryTimeoutMs);
    });
    const response = await Promise.race([
      this.request({ type: "run", sql, maxRows: LIMITS.maxResultRows }),
      timeout,
    ]);
    clearTimeout(timer);

    if (response === "timeout") {
      this.kill();
      this.onStatus("idle"); // reboots on the next run
      return { type: "timeout" };
    }
    this.onStatus("ready");
    if (response.type === "result") {
      return { type: "result", result: response.result, runtimeMs: response.runtimeMs };
    }
    if (response.type === "query_error") {
      return { type: "error", message: response.message, position: response.position };
    }
    return { type: "error", message: "Unexpected response from the database." };
  }

  dispose() {
    this.disposed = true;
    this.kill();
  }

  private request(message: WithoutId<BrowserRequest>): Promise<BrowserResponse> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.worker?.postMessage({ ...message, id } as BrowserRequest);
    });
  }

  private kill() {
    this.worker?.terminate();
    this.worker = null;
    this.loading = null;
    // Settle anything still waiting on the dead worker instead of leaving it hanging forever.
    for (const [id, resolve] of this.pending) {
      resolve({ id, type: "query_error", message: "The database was stopped." });
    }
    this.pending.clear();
  }
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BrowserSandbox, type RunOutcome, type SandboxStatus } from "@/lib/sandbox/browser-sandbox";

/**
 * Boots a browser sandbox for the problem as soon as the page mounts (so Postgres is usually
 * ready by the time the user has written a query) and tears it down on unmount.
 */
export function useSandbox(setupSql: string) {
  const [status, setStatus] = useState<SandboxStatus>("idle");
  const sandboxRef = useRef<BrowserSandbox | null>(null);

  useEffect(() => {
    const sandbox = new BrowserSandbox(setupSql, setStatus);
    sandboxRef.current = sandbox;
    sandbox.start().catch(() => {
      // Status is already "failed"; the next Run retries and reports the error.
    });
    return () => {
      sandbox.dispose();
      sandboxRef.current = null;
    };
  }, [setupSql]);

  const run = useCallback(async (sql: string): Promise<RunOutcome> => {
    const sandbox = sandboxRef.current;
    if (!sandbox) return { type: "error", message: "The database is not available." };
    return sandbox.run(sql);
  }, []);

  return { status, run };
}

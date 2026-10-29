"use client";

import Link from "next/link";

/** Route-level error boundary: e.g. Supabase unreachable while loading problems. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-hard font-mono text-sm">ERROR: something went wrong</p>
      <h1 className="text-3xl font-semibold tracking-tight">This page failed to load</h1>
      <p className="text-muted">
        It&apos;s probably temporary. Try again, and if it keeps happening, come back in a bit.
      </p>
      {error.digest && <p className="text-muted font-mono text-xs">Reference: {error.digest}</p>}
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-accent text-accent-foreground inline-flex h-10 items-center rounded-md px-5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/problems"
          className="border-border hover:bg-surface inline-flex h-10 items-center rounded-md border px-5 text-sm transition-colors"
        >
          All problems
        </Link>
      </div>
    </section>
  );
}

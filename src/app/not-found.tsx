import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-accent font-mono text-sm">SELECT * FROM pages WHERE url = …</p>
      <h1 className="text-3xl font-semibold tracking-tight">0 rows returned</h1>
      <p className="text-muted">That page doesn&apos;t exist, or the problem was unpublished.</p>
      <Link
        href="/problems"
        className="bg-accent text-accent-foreground mt-2 inline-flex h-10 items-center rounded-md px-5 text-sm font-medium transition-opacity hover:opacity-90"
      >
        Browse problems
      </Link>
    </section>
  );
}

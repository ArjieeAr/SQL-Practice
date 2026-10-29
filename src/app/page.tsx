import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-24">
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Sharpen your SQL on real interview-style problems.
      </h1>
      <p className="text-muted max-w-xl text-lg">
        Write queries against a Postgres that runs entirely in your browser, then submit them to be
        graded against hidden test cases full of NULLs, ties, and empty tables.
      </p>
      <div>
        <Link
          href="/problems"
          className="bg-accent text-accent-foreground inline-flex h-10 items-center rounded-md px-5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Browse problems
        </Link>
      </div>
    </section>
  );
}

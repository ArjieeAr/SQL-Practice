import { Cpu, EyeOff, LineChart, Play } from "lucide-react";
import Link from "next/link";

import { getProblemSummaries } from "@/lib/data/problems";

const FEATURES = [
  {
    icon: Play,
    title: "Run instantly, in your browser",
    body: "A real Postgres compiled to WebAssembly runs your query against the sample data. No server round trip, no account needed.",
  },
  {
    icon: EyeOff,
    title: "Graded on hidden test cases",
    body: "Submit and your query is checked against data you haven't seen: NULLs, ties, empty tables, and month boundaries.",
  },
  {
    icon: Cpu,
    title: "Sandboxed by design",
    body: "User SQL never touches the real database. Each test case gets a fresh, read-only Postgres in its own thread with a hard time limit.",
  },
  {
    icon: LineChart,
    title: "Track your progress",
    body: "Solved counts by difficulty, a daily streak, and every submission you've made, with the query that produced it.",
  },
];

export default async function HomePage() {
  // Cached, so the counts are part of the static page.
  const problems = await getProblemSummaries();
  const count = (d: string) => problems.filter((p) => p.difficulty === d).length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-20">
      <section className="flex flex-col gap-6">
        <p className="text-accent font-mono text-sm">
          {problems.length} problems · {count("easy")} easy · {count("medium")} medium ·{" "}
          {count("hard")} hard
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Sharpen your SQL on interview-style problems.
        </h1>
        <p className="text-muted max-w-2xl text-lg">
          JOINs, GROUP BY, window functions, CTEs, and the edge cases that trip people up. Write a
          query, run it on sample data in your browser, then submit it against hidden tests.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/problems"
            className="bg-accent text-accent-foreground inline-flex h-11 items-center rounded-md px-6 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Browse problems
          </Link>
          <Link
            href="/problems/customers-without-orders"
            className="border-border hover:bg-surface inline-flex h-11 items-center rounded-md border px-6 text-sm transition-colors"
          >
            Try problem #1
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="border-border bg-surface flex gap-4 rounded-lg border p-5">
            <Icon className="text-accent mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="flex flex-col gap-1">
              <h2 className="font-medium">{title}</h2>
              <p className="text-muted text-sm">{body}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

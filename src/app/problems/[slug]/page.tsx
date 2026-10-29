import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Markdown } from "@/components/problem/markdown";
import { PanelTabs } from "@/components/problem/panel-tabs";
import { ProblemSession } from "@/components/problem/problem-session";
import { ProblemWorkspace } from "@/components/problem/problem-workspace";
import { SampleData, SchemaColumns, SqlBlock } from "@/components/problem/schema-viewer";
import { SubmissionHistory } from "@/components/problem/submission-history";
import { DifficultyBadge } from "@/components/problems/difficulty-badge";
import { getProblem, getProblemSummaries } from "@/lib/data/problems";
import { TAGS, type Tag } from "@/lib/problems/tags";

/** Prerender every published problem at build time. */
export async function generateStaticParams() {
  const problems = await getProblemSummaries();
  return problems.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/problems/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const problem = await getProblem(slug);
  return { title: problem ? `${problem.number}. ${problem.title}` : "Problem not found" };
}

export default function ProblemPage({ params }: PageProps<"/problems/[slug]">) {
  // params is awaited inside the boundary so Next can still serve an app shell for new slugs.
  return (
    <Suspense fallback={<ProblemSkeleton />}>
      <ProblemView params={params} />
    </Suspense>
  );
}

async function ProblemView({ params }: Pick<PageProps<"/problems/[slug]">, "params">) {
  const { slug } = await params;
  const problem = await getProblem(slug);
  if (!problem) notFound();

  const tables = problem.sampleTables;

  return (
    <ProblemSession key={problem.slug}>
      <div className="flex flex-1 flex-col lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-2">
        <div className="border-border flex min-h-0 flex-col lg:border-r">
          <header className="border-border flex flex-col gap-2 border-b px-4 py-3">
            <Link
              href="/problems"
              className="text-muted hover:text-foreground inline-flex w-fit items-center gap-1 text-xs"
            >
              <ArrowLeft className="size-3" /> All problems
            </Link>
            <h1 className="text-lg font-semibold">
              {problem.number}. {problem.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <DifficultyBadge difficulty={problem.difficulty} />
              {problem.tags.map((tag) => (
                <span key={tag} className="bg-surface text-muted rounded px-1.5 py-0.5 text-xs">
                  {TAGS[tag as Tag] ?? tag}
                </span>
              ))}
            </div>
          </header>
          <PanelTabs
            label="Problem"
            tabs={[
              {
                id: "description",
                label: "Description",
                content: (
                  <div className="flex flex-col gap-6">
                    <Markdown>{problem.descriptionMd}</Markdown>
                    <section className="flex flex-col gap-2">
                      <h2 className="text-sm font-semibold">Tables</h2>
                      {tables ? (
                        <SchemaColumns tables={tables} />
                      ) : (
                        <SqlBlock sql={problem.schemaSql} />
                      )}
                    </section>
                  </div>
                ),
              },
              {
                id: "data",
                label: "Sample data",
                content: tables ? (
                  <SampleData tables={tables} />
                ) : (
                  <SqlBlock sql={problem.sampleDataSql} />
                ),
              },
              {
                id: "submissions",
                label: "Submissions",
                content: <SubmissionHistory slug={problem.slug} />,
              },
            ]}
          />
        </div>

        <ProblemWorkspace
          slug={problem.slug}
          setupSql={`${problem.schemaSql}\n${problem.sampleDataSql}`}
          orderMatters={problem.orderMatters}
          sampleExpected={problem.sampleExpected}
          tables={tables ?? []}
        />
      </div>
    </ProblemSession>
  );
}

function ProblemSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:grid lg:grid-cols-2" aria-busy="true">
      <div className="flex flex-col gap-3">
        <div className="bg-surface h-6 w-1/2 animate-pulse rounded" />
        <div className="bg-surface h-4 w-1/4 animate-pulse rounded" />
        <div className="bg-surface h-40 animate-pulse rounded" />
      </div>
      <div className="bg-surface h-96 animate-pulse rounded" />
    </div>
  );
}

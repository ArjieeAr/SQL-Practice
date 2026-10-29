import { KeyRound, Link2 } from "lucide-react";

import type { SampleTable } from "@/lib/problems/preview";

import { ResultTable } from "./result-table";

/** Shorten Postgres's verbose type names to what people write in DDL. */
function shortType(type: string) {
  return type
    .replace("timestamp without time zone", "timestamp")
    .replace("timestamp with time zone", "timestamptz")
    .replace("character varying", "varchar")
    .replace(/^integer$/, "int");
}

/** Column list per table: names, types, keys. Shown next to the problem description. */
export function SchemaColumns({ tables }: { tables: SampleTable[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tables.map((table) => (
        <div key={table.name} className="border-border bg-surface rounded-md border">
          <h3 className="border-border border-b px-3 py-2 font-mono text-sm font-semibold">
            {table.name}
          </h3>
          <ul className="divide-border divide-y font-mono text-xs">
            {table.columns.map((column) => (
              <li key={column.name} className="flex items-center gap-2 px-3 py-1.5">
                <span className="flex-1">
                  {column.name}
                  {column.primaryKey && (
                    <KeyRound
                      className="text-medium ml-1.5 inline size-3"
                      aria-label="primary key"
                    />
                  )}
                </span>
                {column.references && (
                  <span className="text-muted inline-flex items-center gap-1" title="foreign key">
                    <Link2 className="size-3" aria-hidden />
                    {column.references}
                  </span>
                )}
                <span className="text-accent">
                  {shortType(column.type)}
                  {!column.notNull && !column.primaryKey && (
                    <span className="text-muted"> null</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Every sample row of every table: the data that "Run" executes against. */
export function SampleData({ tables }: { tables: SampleTable[] }) {
  return (
    <div className="flex flex-col gap-6">
      {tables.map((table) => (
        <section key={table.name} className="flex flex-col gap-2">
          <h3 className="font-mono text-sm font-semibold">{table.name}</h3>
          <ResultTable result={table.rows} />
        </section>
      ))}
    </div>
  );
}

/** Fallback when the precomputed table previews are missing: show the SQL itself. */
export function SqlBlock({ sql }: { sql: string }) {
  return (
    <pre className="border-border bg-surface overflow-auto rounded-md border p-3 font-mono text-xs leading-relaxed">
      {sql.trim()}
    </pre>
  );
}

import type { RawResult, RawValue } from "@/lib/sql/types";

/** Render a value the way psql would: arrays as {a,b}, NULL visibly distinct from text. */
function formatValue(value: Exclude<RawValue, null>): string {
  return Array.isArray(value)
    ? `{${value.map((v) => (v === null ? "NULL" : formatValue(v))).join(",")}}`
    : value;
}

export function ResultTable({ result }: { result: RawResult }) {
  if (result.columns.length === 0) {
    return <p className="text-muted text-sm">The query returned no columns.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="border-border overflow-auto rounded-md border">
        <table className="w-full font-mono text-xs">
          <thead className="bg-surface sticky top-0">
            <tr>
              {result.columns.map((column, i) => (
                <th
                  key={i}
                  scope="col"
                  className="border-border text-muted border-b px-3 py-2 text-left font-medium whitespace-nowrap"
                >
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {result.rows.map((row, r) => (
              <tr key={r}>
                {row.map((value, c) => (
                  <td key={c} className="max-w-xs truncate px-3 py-1.5 whitespace-nowrap">
                    {value === null ? (
                      <span className="text-muted italic">NULL</span>
                    ) : (
                      formatValue(value)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {result.rows.length === 0 && (
          <p className="text-muted px-3 py-4 text-center text-xs">(no rows)</p>
        )}
      </div>
      {result.truncated && (
        <p className="text-medium text-xs">Showing the first {result.rows.length} rows.</p>
      )}
    </div>
  );
}

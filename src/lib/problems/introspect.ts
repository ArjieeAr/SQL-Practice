import type { PGlite } from "@electric-sql/pglite";

import { runReadOnlyQuery } from "@/lib/sandbox/engine.mjs";
import { LIMITS } from "@/lib/sql/limits";

import type { SampleTable } from "./preview";

interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  not_null: string; // the sandbox returns raw Postgres text: 't' / 'f'
  primary_key: string;
  references_column: string | null;
}

/** Tables in creation order, each column with its PK/FK role, from the system catalogs. */
const COLUMNS_SQL = `
  SELECT c.relname AS table_name,
         a.attname AS column_name,
         format_type(a.atttypid, a.atttypmod) AS data_type,
         a.attnotnull AS not_null,
         EXISTS (
           SELECT 1 FROM pg_index i
           WHERE i.indrelid = c.oid AND i.indisprimary AND a.attnum = ANY (i.indkey)
         ) AS primary_key,
         (
           SELECT fc.relname || '.' || fa.attname
           FROM pg_constraint fk
           JOIN pg_class fc ON fc.oid = fk.confrelid
           JOIN pg_attribute fa ON fa.attrelid = fk.confrelid AND fa.attnum = fk.confkey[1]
           WHERE fk.conrelid = c.oid AND fk.contype = 'f' AND fk.conkey = ARRAY[a.attnum]
           LIMIT 1
         ) AS references_column
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY c.oid, a.attnum
`;

/** Describe every table in a loaded sandbox, with its rows, for the problem's schema viewer. */
export async function introspectTables(db: PGlite): Promise<SampleTable[]> {
  const { rows } = await db.query<ColumnRow>(COLUMNS_SQL);

  const tables = new Map<string, SampleTable["columns"]>();
  for (const row of rows) {
    const columns = tables.get(row.table_name) ?? [];
    columns.push({
      name: row.column_name,
      type: row.data_type,
      notNull: row.not_null === "t",
      primaryKey: row.primary_key === "t",
      references: row.references_column,
    });
    tables.set(row.table_name, columns);
  }

  const result: SampleTable[] = [];
  for (const [name, columns] of tables) {
    const quoted = `"${name.replaceAll('"', '""')}"`;
    // TABLE returns rows in insertion order, which is how the sample data was written.
    result.push({
      name,
      columns,
      rows: await runReadOnlyQuery(db, `TABLE ${quoted}`, LIMITS.maxResultRows),
    });
  }
  return result;
}

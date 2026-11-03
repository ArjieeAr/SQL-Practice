// @ts-check
/**
 * Describes the tables in a loaded sandbox for the problem's schema viewer. Plain ESM + JSDoc
 * because it runs inside the verification worker (see engine.mjs).
 */
import { runReadOnlyQuery } from "./engine.mjs";

/** @typedef {import("../problems/preview").SampleTable} SampleTable */

/**
 * @typedef {object} ColumnRow
 * @property {string} table_name
 * @property {string} column_name
 * @property {string} data_type
 * @property {string} not_null the sandbox returns raw Postgres text: 't' / 'f'
 * @property {string} primary_key
 * @property {string | null} references_column
 */

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

/**
 * Describe every table in a loaded sandbox, with its rows.
 *
 * @param {import("@electric-sql/pglite").PGlite} db
 * @param {number} maxRows
 * @returns {Promise<SampleTable[]>}
 */
export async function introspectTables(db, maxRows) {
  const { rows } = /** @type {{ rows: ColumnRow[] }} */ (await db.query(COLUMNS_SQL));

  /** @type {Map<string, SampleTable["columns"]>} */
  const tables = new Map();
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

  /** @type {SampleTable[]} */
  const result = [];
  for (const [name, columns] of tables) {
    const quoted = `"${name.replaceAll('"', '""')}"`;
    // TABLE returns rows in insertion order, which is how the sample data was written.
    result.push({ name, columns, rows: await runReadOnlyQuery(db, `TABLE ${quoted}`, maxRows) });
  }
  return result;
}

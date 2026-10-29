// @ts-check
/**
 * The query engine shared by the browser runner ("Run") and the grading worker ("Submit").
 *
 * Plain ESM + JSDoc rather than TypeScript so Node can load it directly inside a worker thread
 * without going through the Next.js bundler. It is still type-checked by `tsc` via @ts-check.
 */
import { PGlite, types } from "@electric-sql/pglite";

/** @typedef {import("../sql/types").RawResult} RawResult */

/**
 * Identity parsers for every type PGlite would otherwise convert to a JS value (Date, bigint,
 * boolean, parsed JSON...). We want Postgres's own text output so normalization is deterministic
 * and results serialize cleanly across worker / network boundaries.
 */
const RAW_TEXT_PARSERS = Object.fromEntries(
  Object.keys(types.parsers)
    .filter((key) => /^\d+$/.test(key))
    .map((oid) => [oid, (/** @type {string} */ text) => text]),
);

const CURSOR_NAME = "user_query";
const CURSOR_PREFIX = `DECLARE ${CURSOR_NAME} NO SCROLL CURSOR FOR `;

export class SandboxQueryError extends Error {
  /**
   * @param {string} message
   * @param {number | undefined} position 1-based character offset into the user's SQL, if known.
   */
  constructor(message, position) {
    super(message);
    this.name = "SandboxQueryError";
    this.position = position;
  }
}

/**
 * Boot a fresh in-memory Postgres and load the problem schema + data into it.
 *
 * A cold boot runs initdb, which costs ~2s. Passing `snapshot` (from createSnapshot) restores an
 * already-initialized, empty cluster instead, in ~300ms. Every call still gets its own database.
 *
 * @param {string} setupSql
 * @param {ArrayBufferLike} [snapshot]
 */
export async function createSandbox(setupSql, snapshot) {
  const db = await PGlite.create({
    parsers: RAW_TEXT_PARSERS,
    // slice() copies out of the SharedArrayBuffer: Blob only accepts non-shared memory.
    loadDataDir: snapshot ? new Blob([new Uint8Array(snapshot).slice()]) : undefined,
  });
  if (setupSql.trim()) await db.exec(setupSql);
  return db;
}

/**
 * Initialize an empty cluster once and return its data directory as a SharedArrayBuffer, so
 * worker threads can all read it without copying it between threads.
 */
export async function createSnapshot() {
  const db = await PGlite.create();
  const blob = await db.dumpDataDir("none");
  await db.close();
  const shared = new SharedArrayBuffer(blob.size);
  new Uint8Array(shared).set(new Uint8Array(await blob.arrayBuffer()));
  return shared;
}

/**
 * Run one query read-only and return at most `maxRows` rows.
 *
 * The query is wrapped in a cursor inside a READ ONLY transaction:
 * - `DECLARE ... CURSOR FOR` only accepts SELECT/VALUES, and rejects data-modifying CTEs.
 * - `FETCH n` caps how many rows get materialized, so a huge result can't blow up memory.
 * - PGlite's `query()` uses the extended protocol, which rejects multiple statements, so the
 *   user can't append `; COMMIT; DROP TABLE ...`.
 * The transaction is always rolled back, leaving the database unchanged for the next query.
 *
 * @param {PGlite} db
 * @param {string} sql
 * @param {number} maxRows
 * @returns {Promise<RawResult>}
 */
export async function runReadOnlyQuery(db, sql, maxRows) {
  await db.exec("BEGIN READ ONLY");
  try {
    await db.query(CURSOR_PREFIX + sql);
    /** @type {import("@electric-sql/pglite").Results<unknown[]>} */
    const res = await db.query(`FETCH FORWARD ${maxRows + 1} FROM ${CURSOR_NAME}`, [], {
      rowMode: "array",
    });
    const truncated = res.rows.length > maxRows;
    return {
      columns: res.fields.map((f) => ({ name: f.name, typeId: f.dataTypeID })),
      rows: /** @type {RawResult["rows"]} */ (truncated ? res.rows.slice(0, maxRows) : res.rows),
      truncated,
    };
  } catch (err) {
    throw toQueryError(err);
  } finally {
    await db.exec("ROLLBACK");
  }
}

/**
 * Convert a Postgres error into a SandboxQueryError whose position points into the user's SQL
 * rather than into our DECLARE wrapper.
 * @param {unknown} err
 */
function toQueryError(err) {
  const e = /** @type {{ message?: string, position?: string }} */ (err);
  const raw = Number(e?.position);
  const position = raw > CURSOR_PREFIX.length ? raw - CURSOR_PREFIX.length : undefined;
  return new SandboxQueryError(e?.message ?? String(err), position);
}

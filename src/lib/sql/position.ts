/**
 * Convert Postgres's error position (a 1-based character offset into the query) into a 1-based
 * line and column, for messages like "line 3, column 8" and editor markers.
 */
export function positionToLineColumn(sql: string, position: number) {
  const before = sql.slice(0, Math.max(0, position - 1));
  const lines = before.split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

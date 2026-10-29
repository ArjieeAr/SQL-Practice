import { LIMITS } from "./limits";

export type GuardResult = { ok: true } | { ok: false; message: string };

/** Strip leading whitespace and SQL comments so we can look at the first real token. */
function stripLeadingComments(sql: string): string {
  let rest = sql;
  for (;;) {
    rest = rest.trimStart();
    if (rest.startsWith("--")) {
      const newline = rest.indexOf("\n");
      rest = newline === -1 ? "" : rest.slice(newline + 1);
    } else if (rest.startsWith("/*")) {
      const end = rest.indexOf("*/");
      rest = end === -1 ? "" : rest.slice(end + 2);
    } else {
      return rest;
    }
  }
}

const READ_QUERY_START = /^(select|with|values|table)\b|^\(/i;

/**
 * Cheap checks before a query reaches the sandbox. This is a usability filter, not the security
 * boundary: the sandbox itself enforces read-only, single-statement execution. Its job is to turn
 * "syntax error at or near DELETE" into a message that explains what's allowed.
 */
export function checkUserQuery(sql: string): GuardResult {
  if (sql.length > LIMITS.maxQueryLength) {
    return {
      ok: false,
      message: `Query is too long (${sql.length} characters; the limit is ${LIMITS.maxQueryLength}).`,
    };
  }

  const body = stripLeadingComments(sql);
  if (body.trim() === "") return { ok: false, message: "Write a query first." };

  if (!READ_QUERY_START.test(body)) {
    return {
      ok: false,
      message: "Only read queries are supported: start with SELECT, WITH, VALUES, or TABLE.",
    };
  }
  return { ok: true };
}

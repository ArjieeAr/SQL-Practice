const DEFAULT_PATH = "/problems";

/**
 * Sanitize a `?next=` redirect target so sign-in can only send users back into this site.
 * Rejects absolute URLs and protocol-relative "//evil.com" (an open redirect otherwise).
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return DEFAULT_PATH;
  }
  return value;
}

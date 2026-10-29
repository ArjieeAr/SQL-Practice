import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it.each(["/problems", "/problems/running-balance", "/profile?tab=recent"])(
    "keeps the in-site path %s",
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    null,
    undefined,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "problems",
  ])("falls back to /problems for %j", (value) => {
    expect(safeNextPath(value)).toBe("/problems");
  });
});

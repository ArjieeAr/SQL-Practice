import { describe, expect, it } from "vitest";

import { timeAgo } from "@/lib/submissions/status";

const NOW = new Date("2026-10-29T12:00:00Z").getTime();
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

describe("timeAgo", () => {
  it.each([
    [10, "just now"],
    [90, "1 minute ago"],
    [150, "2 minutes ago"],
    [3 * 3600, "3 hours ago"],
    [24 * 3600, "yesterday"],
    [10 * 24 * 3600, "last week"],
  ])("%i seconds ago -> %s", (seconds, expected) => {
    expect(timeAgo(ago(seconds), NOW)).toBe(expected);
  });
});

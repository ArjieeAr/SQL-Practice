import type { Enums } from "@/types/database";

type SubmissionStatus = Enums<"submission_status">;

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  accepted: "Accepted",
  wrong_answer: "Wrong Answer",
  error: "Error",
  timeout: "Time Limit Exceeded",
};

export const STATUS_COLOR: Record<SubmissionStatus, string> = {
  accepted: "text-easy",
  wrong_answer: "text-hard",
  error: "text-hard",
  timeout: "text-medium",
};

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 minutes ago", "yesterday", "just now". */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    // Truncate: 90 seconds ago is "1 minute ago" (Math.round would also be sign-dependent).
    if (Math.abs(seconds) >= size) return relative.format(Math.trunc(seconds / size), unit);
  }
  return "just now";
}

/** Topic tags used to filter the problem list. The key is what's stored in problems.tags. */
export const TAGS = {
  joins: "JOINs",
  "group-by": "GROUP BY",
  "window-functions": "Window functions",
  ctes: "CTEs",
  subqueries: "Subqueries",
  "null-handling": "NULL handling",
  dates: "Dates & times",
} as const;

export type Tag = keyof typeof TAGS;

export const TAG_IDS = Object.keys(TAGS) as [Tag, ...Tag[]];

export function isTag(value: string): value is Tag {
  return value in TAGS;
}

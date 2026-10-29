import { describe, expect, it } from "vitest";

import { positionToLineColumn } from "@/lib/sql/position";

describe("positionToLineColumn", () => {
  it("handles a single line", () => {
    expect(positionToLineColumn("SELECT nme FROM t", 8)).toEqual({ line: 1, column: 8 });
  });

  it("counts lines and resets the column after each newline", () => {
    const sql = "SELECT id\nFROM t\nWHERE nme = 1";
    // "nme" starts at character 24 (1-based): 10 chars on line 1, 7 on line 2, then "WHERE ".
    expect(positionToLineColumn(sql, 24)).toEqual({ line: 3, column: 7 });
  });

  it("treats position 1 as the very start", () => {
    expect(positionToLineColumn("x", 1)).toEqual({ line: 1, column: 1 });
  });
});

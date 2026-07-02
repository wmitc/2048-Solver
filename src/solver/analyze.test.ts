import { describe, expect, it } from "vitest";
import { boardFromValues } from "../engine/board.ts";
import { chooseMaxDepth, iterativeDeepening } from "./analyze.ts";

describe("chooseMaxDepth", () => {
  it("searches deeper as the board fills up", () => {
    const open = boardFromValues([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const cramped = boardFromValues([
      [2, 4, 8, 16],
      [16, 8, 4, 2],
      [2, 4, 8, 16],
      [16, 8, 4, 0],
    ]);
    expect(chooseMaxDepth(cramped)).toBeGreaterThan(chooseMaxDepth(open));
  });
});

describe("iterativeDeepening", () => {
  it("yields one result per depth up to the cap, flagging the last as final", () => {
    const board = boardFromValues([
      [2, 4, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const updates = [...iterativeDeepening(board, { maxDepth: 3 })];
    expect(updates.map((u) => u.result.stats.depth)).toEqual([1, 2, 3]);
    expect(updates.slice(0, -1).every((u) => !u.final)).toBe(true);
    expect(updates[updates.length - 1].final).toBe(true);
  });

  it("stops immediately on a terminal board", () => {
    const stuck = boardFromValues([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    const updates = [...iterativeDeepening(stuck, { maxDepth: 5 })];
    expect(updates).toHaveLength(1);
    expect(updates[0].final).toBe(true);
    expect(updates[0].result.best).toBeNull();
  });

  it("keeps recommending a legal move as depth increases", () => {
    const board = boardFromValues([
      [64, 2, 2, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    for (const { result } of iterativeDeepening(board, { maxDepth: 3 })) {
      expect(result.best).not.toBeNull();
    }
  });
});

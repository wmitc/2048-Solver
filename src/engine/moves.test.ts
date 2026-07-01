import { describe, expect, it } from "vitest";
import { boardFromValues, boardToValues } from "./board.ts";
import { applyMove, canMove, hasAnyMove, slideLine } from "./moves.ts";

describe("slideLine", () => {
  it("compacts tiles toward the front", () => {
    // exponents: [_, 2, _, 2] -> value view [0,4,0,4]
    const { line, gained } = slideLine([0, 2, 0, 2]);
    expect(line).toEqual([3, 0, 0, 0]); // merged 4+4 => 8 (exp 3)
    expect(gained).toBe(8);
  });

  it("merges only once per move and preferentially from the front", () => {
    // [2,2,2] value view -> front pair merges, trailing tile slides
    const { line, gained } = slideLine([1, 1, 1, 0]);
    expect(line).toEqual([2, 1, 0, 0]); // 2+2=4 (exp 2), lone 2 (exp 1)
    expect(gained).toBe(4);
  });

  it("does not chain a freshly merged tile", () => {
    // [4,4,8] -> 8,8 must NOT become 16 in the same move
    const { line, gained } = slideLine([2, 2, 3, 0]);
    expect(line).toEqual([3, 3, 0, 0]); // two separate 8s (exp 3)
    expect(gained).toBe(8);
  });

  it("leaves a compact line unchanged", () => {
    const { line, gained } = slideLine([1, 2, 3, 4]);
    expect(line).toEqual([1, 2, 3, 4]);
    expect(gained).toBe(0);
  });
});

describe("applyMove", () => {
  it("slides left and merges rows", () => {
    const board = boardFromValues([
      [2, 2, 0, 0],
      [4, 0, 4, 0],
      [0, 0, 0, 2],
      [8, 8, 8, 8],
    ]);
    const result = applyMove(board, "left");
    expect(result.moved).toBe(true);
    expect(boardToValues(result.board)).toEqual([
      [4, 0, 0, 0],
      [8, 0, 0, 0],
      [2, 0, 0, 0],
      [16, 16, 0, 0],
    ]);
    expect(result.gained).toBe(4 + 8 + 16 + 16);
  });

  it("slides right toward the far edge", () => {
    const board = boardFromValues([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const result = applyMove(board, "right");
    expect(boardToValues(result.board)[0]).toEqual([0, 0, 0, 4]);
  });

  it("slides up and down along columns", () => {
    const board = boardFromValues([
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(boardToValues(applyMove(board, "up").board)[0][0]).toBe(4);
    expect(boardToValues(applyMove(board, "down").board)[3][0]).toBe(4);
  });

  it("reports an illegal move and returns the same board reference", () => {
    const board = boardFromValues([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    const result = applyMove(board, "left");
    expect(result.moved).toBe(false);
    expect(result.gained).toBe(0);
    expect(result.board).toBe(board);
  });
});

describe("canMove / hasAnyMove", () => {
  it("detects a fully stuck board as game over", () => {
    const stuck = boardFromValues([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    expect(hasAnyMove(stuck)).toBe(false);
    expect(canMove(stuck, "up")).toBe(false);
  });

  it("detects an available merge even when the board is full", () => {
    const board = boardFromValues([
      [2, 2, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    expect(hasAnyMove(board)).toBe(true);
  });
});

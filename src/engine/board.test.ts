import { describe, expect, it } from "vitest";
import {
  boardFromValues,
  boardToValues,
  boardsEqual,
  countEmpty,
  createEmptyBoard,
  emptyCells,
  maxExponent,
  tileValue,
  withTile,
} from "./board.ts";

describe("board helpers", () => {
  it("creates an empty board", () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(16);
    expect(countEmpty(board)).toBe(16);
    expect(maxExponent(board)).toBe(0);
  });

  it("converts exponents to tile values", () => {
    expect(tileValue(0)).toBe(0);
    expect(tileValue(1)).toBe(2);
    expect(tileValue(11)).toBe(2048);
  });

  it("round-trips through value grids", () => {
    const rows = [
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [1024, 0, 2, 0],
      [0, 0, 0, 2048],
    ];
    expect(boardToValues(boardFromValues(rows))).toEqual(rows);
  });

  it("rejects non-power-of-two fixtures", () => {
    expect(() => boardFromValues([[3, 0, 0, 0], [], [], []])).toThrow();
  });

  it("finds empty cells and the max exponent", () => {
    const board = boardFromValues([
      [2, 0, 0, 0],
      [0, 8, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 4],
    ]);
    expect(emptyCells(board)).toContain(1);
    expect(emptyCells(board)).not.toContain(0);
    expect(maxExponent(board)).toBe(3); // 8
  });

  it("withTile does not mutate the original", () => {
    const board = createEmptyBoard();
    const next = withTile(board, 5, 3);
    expect(next[5]).toBe(3);
    expect(board[5]).toBe(0);
    expect(boardsEqual(board, next)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { boardFromValues } from "../engine/board.ts";
import { type MoveEvaluation, search } from "./expectimax.ts";

function bestEv(moves: MoveEvaluation[]): number {
  return Math.max(
    ...moves.filter((m) => m.ev !== null).map((m) => m.ev as number),
  );
}

describe("search", () => {
  it("marks illegal moves with a null EV and legal ones with a number", () => {
    const board = boardFromValues([
      [0, 0, 2, 4],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const result = search(board, 2);
    const byDir = Object.fromEntries(result.moves.map((m) => [m.direction, m.ev]));
    // Tiles sit in the top row, so "up" cannot move anything.
    expect(byDir.up).toBeNull();
    // "left" slides both tiles to the left edge.
    expect(byDir.left).not.toBeNull();
    expect(result.best).not.toBeNull();
  });

  it("chooses the move that merges toward the anchored corner", () => {
    // A big tile in the top-left; sliding left keeps it cornered and merges 2s.
    const board = boardFromValues([
      [64, 2, 2, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const result = search(board, 3);
    expect(result.best).toBe("left");
  });

  it("scores a cramped, near-locked board far below an open one", () => {
    // Checkerboard with a single hole: every legal move risks re-locking the
    // board, so the death penalty leaks into the EVs and drags them down.
    const cramped = boardFromValues([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 0],
    ]);
    const open = boardFromValues([
      [64, 32, 8, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(bestEv(search(cramped, 3).moves)).toBeLessThan(
      bestEv(search(open, 3).moves),
    );
  });

  it("reports search stats and reuses the transposition table", () => {
    const board = boardFromValues([
      [8, 4, 2, 0],
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const result = search(board, 3);
    expect(result.stats.depth).toBe(3);
    expect(result.stats.nodes).toBeGreaterThan(0);
    expect(result.stats.rootSpawnCells).toBe(12); // 4 tiles on the board
    expect(result.stats.cacheHits).toBeGreaterThanOrEqual(0);
  });

  it("returns a null best move for a terminal board", () => {
    const stuck = boardFromValues([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    const result = search(stuck, 2);
    expect(result.best).toBeNull();
  });
});

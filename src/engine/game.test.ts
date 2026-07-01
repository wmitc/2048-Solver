import { describe, expect, it } from "vitest";
import { boardFromValues, countEmpty, maxExponent } from "./board.ts";
import { createRng } from "./spawn.ts";
import { WIN_EXPONENT, newGame, step } from "./game.ts";

describe("newGame", () => {
  it("starts with two tiles and a zero score", () => {
    const state = newGame(createRng(3));
    expect(countEmpty(state.board)).toBe(14);
    expect(state.score).toBe(0);
    expect(state.over).toBe(false);
    expect(state.moves).toBe(0);
  });
});

describe("step", () => {
  it("applies a legal move, scores it, and spawns a tile", () => {
    const start = {
      board: boardFromValues([
        [2, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]),
      score: 0,
      won: false,
      over: false,
      moves: 0,
    };
    const result = step(start, "left", createRng(9));
    expect(result.moved).toBe(true);
    expect(result.state.score).toBe(4); // merged 2+2
    expect(result.state.moves).toBe(1);
    // one merged tile + one spawned tile => 2 non-empty cells
    expect(countEmpty(result.state.board)).toBe(14);
    expect(result.spawnIndex).toBeGreaterThanOrEqual(0);
  });

  it("rejects an illegal move without spawning or scoring", () => {
    const start = {
      board: boardFromValues([
        [2, 4, 2, 4],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]),
      score: 10,
      won: false,
      over: false,
      moves: 5,
    };
    const result = step(start, "left", createRng(9));
    expect(result.moved).toBe(false);
    expect(result.state).toBe(start);
    expect(result.spawnIndex).toBe(-1);
  });

  it("flags a win when a 2048 tile forms", () => {
    const start = {
      board: boardFromValues([
        [1024, 1024, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]),
      score: 0,
      won: false,
      over: false,
      moves: 0,
    };
    const result = step(start, "left", createRng(2));
    expect(result.state.won).toBe(true);
    expect(maxExponent(result.state.board)).toBeGreaterThanOrEqual(WIN_EXPONENT);
  });

  it("plays a full game to completion without throwing", () => {
    const rng = createRng(999);
    let state = newGame(rng);
    const dirs = ["up", "right", "down", "left"] as const;
    let guard = 0;
    while (!state.over && guard < 5000) {
      for (const dir of dirs) {
        const r = step(state, dir, rng);
        if (r.moved) {
          state = r.state;
          break;
        }
      }
      guard++;
    }
    expect(state.over).toBe(true);
    expect(state.score).toBeGreaterThan(0);
  });
});

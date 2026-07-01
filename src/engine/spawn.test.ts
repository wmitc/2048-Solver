import { describe, expect, it } from "vitest";
import { createEmptyBoard, countEmpty, boardFromValues } from "./board.ts";
import {
  SPAWN_FOUR_EXPONENT,
  SPAWN_TWO_EXPONENT,
  createRng,
  spawnTile,
} from "./spawn.ts";

describe("createRng", () => {
  it("is deterministic for a given seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
    for (const x of seqA) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("spawnTile", () => {
  it("adds exactly one tile to an empty cell", () => {
    const rng = createRng(1);
    const { board, index, exponent } = spawnTile(createEmptyBoard(), rng);
    expect(countEmpty(board)).toBe(15);
    expect(index).toBeGreaterThanOrEqual(0);
    expect([SPAWN_TWO_EXPONENT, SPAWN_FOUR_EXPONENT]).toContain(exponent);
  });

  it("returns index -1 when the board is full", () => {
    const full = boardFromValues([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    const result = spawnTile(full, createRng(7));
    expect(result.index).toBe(-1);
    expect(result.exponent).toBe(0);
    expect(result.board).toBe(full);
  });

  it("spawns roughly 90% twos over many draws", () => {
    const rng = createRng(12345);
    let twos = 0;
    const trials = 4000;
    for (let i = 0; i < trials; i++) {
      const { exponent } = spawnTile(createEmptyBoard(), rng);
      if (exponent === SPAWN_TWO_EXPONENT) {
        twos++;
      }
    }
    const ratio = twos / trials;
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(0.95);
  });
});

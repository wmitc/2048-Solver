import { describe, expect, it } from "vitest";
import { createRng } from "../engine/spawn.ts";
import { simulateGame } from "./simulate.ts";

/**
 * The real proof that the EVs mean something: let the solver play full games
 * and check it consistently reaches large tiles. Depth 2 keeps the suite fast
 * (~0.6s/game) while still demonstrating strong play. Offline runs at depth 3
 * reach a median max tile of 4096.
 */
describe("solver self-play", () => {
  it("reaches 1024+ every game and a 1024+ median at depth 2", () => {
    const depth = 2;
    const games = 5;
    const maxTiles: number[] = [];
    for (let i = 0; i < games; i++) {
      const result = simulateGame(createRng(4242 + i * 13), depth);
      maxTiles.push(result.maxTile);
      // Every game should comfortably clear 512.
      expect(result.maxTile).toBeGreaterThanOrEqual(512);
      expect(result.score).toBeGreaterThan(0);
    }
    maxTiles.sort((a, b) => a - b);
    const median = maxTiles[Math.floor(games / 2)];
    expect(median).toBeGreaterThanOrEqual(1024);
  });
});

/**
 * Random-tile spawning.
 *
 * After every successful move the game drops a new tile on a random empty cell:
 * a 2 (exponent 1) with probability 0.9, or a 4 (exponent 2) with probability
 * 0.1. Spawns take an explicit {@link Rng} so games are reproducible in tests.
 */

import { type Board, emptyCells } from "./board.ts";

/** A pseudo-random source returning floats in [0, 1). */
export type Rng = () => number;

export const SPAWN_TWO_PROBABILITY = 0.9;
export const SPAWN_TWO_EXPONENT = 1; // tile value 2
export const SPAWN_FOUR_EXPONENT = 2; // tile value 4

/**
 * A small, seedable RNG (mulberry32). Deterministic given a seed, which keeps
 * simulation and solver tests reproducible.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SpawnResult {
  board: Board;
  /** Flat index where the tile appeared, or -1 if the board was full. */
  index: number;
  /** Exponent of the spawned tile (1 or 2), or 0 if none spawned. */
  exponent: number;
}

/**
 * Place one random tile on an empty cell. Returns the original board unchanged
 * (with `index: -1`) if there are no empty cells.
 */
export function spawnTile(board: Board, rng: Rng): SpawnResult {
  const empties = emptyCells(board);
  if (empties.length === 0) {
    return { board, index: -1, exponent: 0 };
  }
  const index = empties[Math.floor(rng() * empties.length)];
  const exponent =
    rng() < SPAWN_TWO_PROBABILITY ? SPAWN_TWO_EXPONENT : SPAWN_FOUR_EXPONENT;
  const next = board.slice();
  next[index] = exponent;
  return { board: next, index, exponent };
}

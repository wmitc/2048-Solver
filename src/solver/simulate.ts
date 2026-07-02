/**
 * Headless self-play: drive a full game with the expectimax solver. Used by the
 * simulation test (to prove the EVs are meaningful) and for offline tuning.
 */

import { type Board, maxExponent, tileValue } from "../engine/board.ts";
import { newGame, step } from "../engine/game.ts";
import { type Rng } from "../engine/spawn.ts";
import { type SearchOptions, search } from "./expectimax.ts";

export interface SimulationResult {
  board: Board;
  score: number;
  moves: number;
  maxTile: number;
}

/** Play one game to completion, picking each move with a depth-limited search. */
export function simulateGame(
  rng: Rng,
  depth: number,
  options: SearchOptions = {},
): SimulationResult {
  let state = newGame(rng);
  let guard = 0;
  while (!state.over && guard < 20_000) {
    const best = search(state.board, depth, options).best;
    if (best === null) {
      break;
    }
    const result = step(state, best, rng);
    if (!result.moved) {
      break; // solver returned an illegal move (shouldn't happen)
    }
    state = result.state;
    guard++;
  }
  return {
    board: state.board,
    score: state.score,
    moves: state.moves,
    maxTile: tileValue(maxExponent(state.board)),
  };
}

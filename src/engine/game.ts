/**
 * Game state machine.
 *
 * Wraps the pure board/move/spawn primitives into a playable game: it tracks
 * score, detects win/lose, and produces the two-tile opening position. The
 * state object is immutable — every transition returns a fresh {@link GameState}.
 */

import {
  type Board,
  type Direction,
  createEmptyBoard,
  maxExponent,
} from "./board.ts";
import { applyMove, hasAnyMove } from "./moves.ts";
import { type Rng, spawnTile } from "./spawn.ts";

/** Exponent of the winning tile (2^11 = 2048). */
export const WIN_EXPONENT = 11;

export interface GameState {
  board: Board;
  score: number;
  /** True once a 2048 tile has appeared (play may continue past this). */
  won: boolean;
  /** True when no legal move remains. */
  over: boolean;
  /** Number of successful moves played so far. */
  moves: number;
}

/** A new game with two starting tiles placed via `rng`. */
export function newGame(rng: Rng): GameState {
  let board = createEmptyBoard();
  board = spawnTile(board, rng).board;
  board = spawnTile(board, rng).board;
  return {
    board,
    score: 0,
    won: maxExponent(board) >= WIN_EXPONENT,
    over: false,
    moves: 0,
  };
}

export interface StepResult {
  state: GameState;
  /** Whether the requested move was legal and applied. */
  moved: boolean;
  /** Flat index of the tile spawned this step, or -1 if none. */
  spawnIndex: number;
}

/**
 * Play one move. If the move is illegal the state is returned unchanged with
 * `moved: false` and no tile spawns. Otherwise the board slides, a random tile
 * spawns, score updates, and win/over flags are recomputed.
 */
export function step(
  state: GameState,
  direction: Direction,
  rng: Rng,
): StepResult {
  if (state.over) {
    return { state, moved: false, spawnIndex: -1 };
  }

  const move = applyMove(state.board, direction);
  if (!move.moved) {
    return { state, moved: false, spawnIndex: -1 };
  }

  const spawn = spawnTile(move.board, rng);
  const board = spawn.board;
  const score = state.score + move.gained;

  return {
    state: {
      board,
      score,
      won: state.won || maxExponent(board) >= WIN_EXPONENT,
      over: !hasAnyMove(board),
      moves: state.moves + 1,
    },
    moved: true,
    spawnIndex: spawn.index,
  };
}

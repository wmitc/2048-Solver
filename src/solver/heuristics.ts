/**
 * Board evaluation.
 *
 * The solver can't search to the end of the game, so leaf positions are scored
 * by a static heuristic — a weighted sum of four classic 2048 features:
 *
 *  - **empty cells**: room to manoeuvre; the single strongest signal.
 *  - **monotonicity**: rows and columns that increase or decrease steadily,
 *    which keeps big tiles herded together instead of scattered.
 *  - **smoothness**: neighbouring tiles with similar values, so merges line up.
 *  - **max-in-corner**: a bonus for anchoring the largest tile in a corner.
 *
 * Features are computed on exponents (a difference of exponents is a log2 tile
 * ratio, which is exactly the scale these features want to reason about).
 */

import { type Board, SIZE, countEmpty, indexOf, maxExponent } from "../engine/board.ts";

export interface HeuristicWeights {
  empty: number;
  monotonicity: number;
  smoothness: number;
  cornerMax: number;
}

/** Tuned so the expectimax solver reliably reaches 1024+ (see simulation test). */
export const DEFAULT_WEIGHTS: HeuristicWeights = {
  empty: 2.7,
  monotonicity: 1.0,
  smoothness: 0.1,
  cornerMax: 1.0,
};

export interface HeuristicBreakdown {
  empty: number;
  monotonicity: number;
  smoothness: number;
  cornerMax: number;
  total: number;
}

/** Number of empty cells (raw feature, before weighting). */
export function emptyFeature(board: Board): number {
  return countEmpty(board);
}

/**
 * Monotonicity penalty (<= 0). For each row and column we measure how far it is
 * from being sorted, in whichever direction is cheaper, and penalise the drops
 * that break that order. A perfectly monotonic line scores 0.
 */
export function monotonicityFeature(board: Board): number {
  let penalty = 0;
  for (let i = 0; i < SIZE; i++) {
    penalty += lineMonotonicity(board, i, "row");
    penalty += lineMonotonicity(board, i, "col");
  }
  return penalty;
}

function lineMonotonicity(board: Board, line: number, kind: "row" | "col"): number {
  let increasing = 0; // cost of drops that break a non-decreasing order
  let decreasing = 0; // cost of drops that break a non-increasing order
  for (let i = 0; i < SIZE - 1; i++) {
    const a = kind === "row" ? board[indexOf(line, i)] : board[indexOf(i, line)];
    const b =
      kind === "row" ? board[indexOf(line, i + 1)] : board[indexOf(i + 1, line)];
    if (a > b) {
      increasing += a - b;
    } else if (b > a) {
      decreasing += b - a;
    }
  }
  return -Math.min(increasing, decreasing);
}

/**
 * Smoothness penalty (<= 0): the negative sum of exponent differences between
 * each tile and the next non-empty tile to its right and below. Smaller (closer
 * to 0) means neighbours are similar and merges are easy to set up.
 */
export function smoothnessFeature(board: Board): number {
  let penalty = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const exp = board[indexOf(r, c)];
      if (exp === 0) {
        continue;
      }
      const right = nextNonEmpty(board, r, c, 0, 1);
      if (right >= 0) {
        penalty -= Math.abs(exp - right);
      }
      const down = nextNonEmpty(board, r, c, 1, 0);
      if (down >= 0) {
        penalty -= Math.abs(exp - down);
      }
    }
  }
  return penalty;
}

function nextNonEmpty(
  board: Board,
  r: number,
  c: number,
  dr: number,
  dc: number,
): number {
  let nr = r + dr;
  let nc = c + dc;
  while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
    const exp = board[indexOf(nr, nc)];
    if (exp !== 0) {
      return exp;
    }
    nr += dr;
    nc += dc;
  }
  return -1;
}

/** Bonus (>= 0): the max exponent when the largest tile sits in a corner. */
export function cornerMaxFeature(board: Board): number {
  const max = maxExponent(board);
  if (max === 0) {
    return 0;
  }
  const corners = [
    indexOf(0, 0),
    indexOf(0, SIZE - 1),
    indexOf(SIZE - 1, 0),
    indexOf(SIZE - 1, SIZE - 1),
  ];
  return corners.some((idx) => board[idx] === max) ? max : 0;
}

/** Full weighted evaluation with a per-feature breakdown. */
export function evaluateBreakdown(
  board: Board,
  weights: HeuristicWeights = DEFAULT_WEIGHTS,
): HeuristicBreakdown {
  const empty = weights.empty * emptyFeature(board);
  const monotonicity = weights.monotonicity * monotonicityFeature(board);
  const smoothness = weights.smoothness * smoothnessFeature(board);
  const cornerMax = weights.cornerMax * cornerMaxFeature(board);
  return {
    empty,
    monotonicity,
    smoothness,
    cornerMax,
    total: empty + monotonicity + smoothness + cornerMax,
  };
}

/** Fast scalar evaluation for the search hot path. */
export function evaluate(
  board: Board,
  weights: HeuristicWeights = DEFAULT_WEIGHTS,
): number {
  return (
    weights.empty * emptyFeature(board) +
    weights.monotonicity * monotonicityFeature(board) +
    weights.smoothness * smoothnessFeature(board) +
    weights.cornerMax * cornerMaxFeature(board)
  );
}

/**
 * Expectimax search.
 *
 * The game alternates between the player (a **max** node — choose the best of
 * the four slides) and the game (a **chance** node — a random 2 or 4 lands on a
 * uniformly-random empty cell). Expectimax evaluates a max node by taking the
 * best child, and a chance node by taking the probability-weighted average of
 * its children, bottoming out at the static {@link evaluate} heuristic.
 *
 * `depth` counts player moves looked ahead. To stay responsive we (a) cache
 * positions in a transposition table keyed by board + remaining depth, and
 * (b) stop expanding chance branches whose cumulative probability falls below a
 * cutoff, evaluating them statically instead.
 */

import {
  type Board,
  type Direction,
  DIRECTIONS,
  emptyCells,
} from "../engine/board.ts";
import { applyMove } from "../engine/moves.ts";
import {
  DEFAULT_WEIGHTS,
  type HeuristicWeights,
  evaluate,
} from "./heuristics.ts";
import {
  SPAWN_FOUR_EXPONENT,
  SPAWN_TWO_EXPONENT,
  SPAWN_TWO_PROBABILITY,
} from "../engine/spawn.ts";

/** Score assigned to a line that dead-ends with no legal move. */
export const DEATH_PENALTY = -1_000_000;

/** Chance branches below this cumulative probability are cut off. */
const DEFAULT_PROBABILITY_CUTOFF = 0.0008;

const SPAWNS: readonly { exponent: number; probability: number }[] = [
  { exponent: SPAWN_TWO_EXPONENT, probability: SPAWN_TWO_PROBABILITY },
  { exponent: SPAWN_FOUR_EXPONENT, probability: 1 - SPAWN_TWO_PROBABILITY },
];

export interface SearchStats {
  /** Player moves searched ahead. */
  depth: number;
  /** Total nodes (max + chance) visited. */
  nodes: number;
  /** Transposition-table hits. */
  cacheHits: number;
  /** Distinct empty cells considered at the root chance layer. */
  rootSpawnCells: number;
  /** Wall-clock time this search took, in milliseconds. */
  elapsedMs: number;
}

export interface MoveEvaluation {
  direction: Direction;
  /** Expected value, or null when the move is illegal. */
  ev: number | null;
}

export interface SearchResult {
  /** Best legal move, or null if the position is terminal. */
  best: Direction | null;
  moves: MoveEvaluation[];
  stats: SearchStats;
}

export interface SearchOptions {
  weights?: HeuristicWeights;
  probabilityCutoff?: number;
}

interface SearchContext {
  weights: HeuristicWeights;
  cutoff: number;
  cache: Map<string, number>;
  stats: SearchStats;
}

/** Pack a board and remaining depth into a transposition-table key. */
function cacheKey(board: Board, depth: number): string {
  let key = String(depth) + ":";
  for (let i = 0; i < board.length; i++) {
    key += board[i].toString(16);
  }
  return key;
}

/** Evaluate every legal move from `board`, searching `depth` moves ahead. */
export function search(
  board: Board,
  depth: number,
  options: SearchOptions = {},
): SearchResult {
  const startedAt = performance.now();
  const ctx: SearchContext = {
    weights: options.weights ?? DEFAULT_WEIGHTS,
    cutoff: options.probabilityCutoff ?? DEFAULT_PROBABILITY_CUTOFF,
    cache: new Map(),
    stats: { depth, nodes: 0, cacheHits: 0, rootSpawnCells: 0, elapsedMs: 0 },
  };

  const moves: MoveEvaluation[] = [];
  let best: Direction | null = null;
  let bestEv = -Infinity;

  for (const direction of DIRECTIONS) {
    const result = applyMove(board, direction);
    if (!result.moved) {
      moves.push({ direction, ev: null });
      continue;
    }
    const ev = chanceNode(result.board, depth, 1, ctx);
    moves.push({ direction, ev });
    if (ev > bestEv) {
      bestEv = ev;
      best = direction;
    }
  }

  ctx.stats.rootSpawnCells = emptyCells(board).length;
  ctx.stats.elapsedMs = performance.now() - startedAt;
  return { best, moves, stats: ctx.stats };
}

/** Player's turn: pick the best slide, or die if none is legal. */
function maxNode(
  board: Board,
  depth: number,
  probability: number,
  ctx: SearchContext,
): number {
  ctx.stats.nodes++;
  if (depth <= 0) {
    return evaluate(board, ctx.weights);
  }

  const key = cacheKey(board, depth);
  const cached = ctx.cache.get(key);
  if (cached !== undefined) {
    ctx.stats.cacheHits++;
    return cached;
  }

  let best = -Infinity;
  for (const direction of DIRECTIONS) {
    const result = applyMove(board, direction);
    if (!result.moved) {
      continue;
    }
    const value = chanceNode(result.board, depth, probability, ctx);
    if (value > best) {
      best = value;
    }
  }

  // No legal move: the line is dead.
  const score = best === -Infinity ? DEATH_PENALTY : best;
  ctx.cache.set(key, score);
  return score;
}

/** Game's turn: average over every spawn (cell x {2, 4}), weighted by odds. */
function chanceNode(
  board: Board,
  depth: number,
  probability: number,
  ctx: SearchContext,
): number {
  ctx.stats.nodes++;
  const empties = emptyCells(board);
  if (empties.length === 0) {
    // Board full after the move; the next player turn decides life or death.
    return maxNode(board, depth - 1, probability, ctx);
  }

  const cellProbability = 1 / empties.length;

  // Once a branch is improbable enough, stop expanding and score statically.
  if (probability * cellProbability < ctx.cutoff) {
    return evaluate(board, ctx.weights);
  }

  let expected = 0;
  const next = board.slice();
  for (const cell of empties) {
    for (const spawn of SPAWNS) {
      next[cell] = spawn.exponent;
      const branchProbability = probability * cellProbability * spawn.probability;
      expected +=
        cellProbability *
        spawn.probability *
        maxNode(next, depth - 1, branchProbability, ctx);
    }
    next[cell] = 0;
  }
  return expected;
}

/**
 * Iterative-deepening driver.
 *
 * Rather than one expensive deep search, we search depth 1, then 2, then 3…,
 * yielding the result at each level. This makes the solver *stream*: the UI
 * shows a quick shallow estimate immediately and watches the EVs settle as the
 * search deepens. Exposed as a generator so it can be both driven step-by-step
 * by the worker (cancellable between depths) and consumed synchronously in
 * tests.
 */

import { type Board, countEmpty } from "../engine/board.ts";
import { type SearchOptions, type SearchResult, search } from "./expectimax.ts";

/**
 * Pick how deep to search. Fewer empty cells means a smaller branching factor
 * *and* a more decisive, dangerous position, so we search deeper there.
 */
export function chooseMaxDepth(board: Board): number {
  const empty = countEmpty(board);
  if (empty > 8) {
    return 3;
  }
  if (empty > 4) {
    return 4;
  }
  if (empty > 2) {
    return 5;
  }
  return 6;
}

export interface IterativeOptions extends SearchOptions {
  /** Hard cap on depth; defaults to {@link chooseMaxDepth}. */
  maxDepth?: number;
  /** Never search shallower than this. */
  minDepth?: number;
}

/**
 * Yield a {@link SearchResult} for each depth from `minDepth` up to the chosen
 * maximum. Stops early once a terminal position is detected (no legal move).
 */
export function* iterativeDeepening(
  board: Board,
  options: IterativeOptions = {},
): Generator<{ result: SearchResult; final: boolean }> {
  const maxDepth = options.maxDepth ?? chooseMaxDepth(board);
  const minDepth = options.minDepth ?? 1;

  for (let depth = minDepth; depth <= maxDepth; depth++) {
    const result = search(board, depth, options);
    const final = depth === maxDepth || result.best === null;
    yield { result, final };
    if (result.best === null) {
      return;
    }
  }
}

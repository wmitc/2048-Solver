/**
 * Slide-and-merge mechanics.
 *
 * All four directions reduce to sliding a line of four cells toward index 0
 * (`slideLine`). We read each row/column into a line in travel order, slide it,
 * then write it back. Merges follow the 2048 rule: tiles combine at most once
 * per move, and a freshly merged tile cannot merge again in the same move.
 */

import {
  type Board,
  type Direction,
  SIZE,
  indexOf,
  boardsEqual,
  tileValue,
} from "./board.ts";

export interface MoveResult {
  /** Board after sliding. Equals the input board when `moved` is false. */
  board: Board;
  /** Whether any tile moved or merged (i.e. the move is legal). */
  moved: boolean;
  /** Points scored this move: the sum of the values of tiles created by merges. */
  gained: number;
}

/**
 * Slide a single line of exponents toward index 0, merging equal neighbours.
 * Returns the resulting line (same length, zero-padded at the end) and the
 * score gained from merges.
 */
export function slideLine(line: readonly number[]): {
  line: number[];
  gained: number;
} {
  const tiles = line.filter((exp) => exp !== 0);
  const result: number[] = [];
  let gained = 0;

  for (let i = 0; i < tiles.length; i++) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const mergedExp = tiles[i] + 1;
      result.push(mergedExp);
      gained += tileValue(mergedExp);
      i++; // consume the partner so it cannot merge again
    } else {
      result.push(tiles[i]);
    }
  }

  while (result.length < line.length) {
    result.push(0);
  }
  return { line: result, gained };
}

/**
 * Read the four cells that form one line, ordered so that the front of the
 * line is the direction of travel. Returns the flat board indices in that
 * order; `writeLine` uses the same order to write results back.
 */
function lineIndices(direction: Direction, lineNo: number): number[] {
  const indices: number[] = [];
  for (let i = 0; i < SIZE; i++) {
    switch (direction) {
      case "left":
        indices.push(indexOf(lineNo, i));
        break;
      case "right":
        indices.push(indexOf(lineNo, SIZE - 1 - i));
        break;
      case "up":
        indices.push(indexOf(i, lineNo));
        break;
      case "down":
        indices.push(indexOf(SIZE - 1 - i, lineNo));
        break;
    }
  }
  return indices;
}

/** Apply a slide to `board`, returning the new board and move metadata. */
export function applyMove(board: Board, direction: Direction): MoveResult {
  const next = board.slice();
  let gained = 0;

  for (let lineNo = 0; lineNo < SIZE; lineNo++) {
    const indices = lineIndices(direction, lineNo);
    const line = indices.map((idx) => board[idx]);
    const slid = slideLine(line);
    gained += slid.gained;
    for (let i = 0; i < indices.length; i++) {
      next[indices[i]] = slid.line[i];
    }
  }

  const moved = !boardsEqual(board, next);
  return { board: moved ? next : board, moved, gained };
}

/** Movement of a single tile during a slide, used to drive UI animations. */
export interface TileTrace {
  /** Flat index the tile started at. */
  from: number;
  /** Flat index the tile ended at. */
  to: number;
  /** Exponent of this tile before the move. */
  exponent: number;
  /**
   * True when this tile slides onto a partner and the two combine. The partner
   * (the tile that arrived first) has `merged: false` and the same `to`.
   */
  merged: boolean;
}

export interface TracedMove extends MoveResult {
  /** Per-tile movements for animating the slide. Empty on illegal moves. */
  traces: TileTrace[];
}

/**
 * Like {@link applyMove}, but also reports where every tile travelled so the
 * renderer can animate the slide. Merges yield two traces sharing a `to`: the
 * surviving base tile (`merged: false`) and the tile that folds into it
 * (`merged: true`).
 */
export function traceMove(board: Board, direction: Direction): TracedMove {
  const base = applyMove(board, direction);
  if (!base.moved) {
    return { ...base, traces: [] };
  }

  const traces: TileTrace[] = [];
  for (let lineNo = 0; lineNo < SIZE; lineNo++) {
    const indices = lineIndices(direction, lineNo);
    const entries: { exponent: number; from: number }[] = [];
    for (const idx of indices) {
      if (board[idx] !== 0) {
        entries.push({ exponent: board[idx], from: idx });
      }
    }

    let slot = 0; // destination position within the line
    for (let i = 0; i < entries.length; i++) {
      const to = indices[slot];
      const current = entries[i];
      const next = entries[i + 1];
      if (next && next.exponent === current.exponent) {
        traces.push({ from: current.from, to, exponent: current.exponent, merged: false });
        traces.push({ from: next.from, to, exponent: next.exponent, merged: true });
        i++; // consume the partner
      } else {
        traces.push({ from: current.from, to, exponent: current.exponent, merged: false });
      }
      slot++;
    }
  }

  return { ...base, traces };
}

/** Whether sliding in `direction` would change the board. */
export function canMove(board: Board, direction: Direction): boolean {
  return applyMove(board, direction).moved;
}

/** Whether any of the four directions is legal. */
export function hasAnyMove(board: Board): boolean {
  return (
    canMove(board, "up") ||
    canMove(board, "down") ||
    canMove(board, "left") ||
    canMove(board, "right")
  );
}

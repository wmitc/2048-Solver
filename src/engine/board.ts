/**
 * Board representation.
 *
 * A board is a flat array of 16 cells in row-major order. Each cell holds an
 * *exponent*: 0 means the cell is empty, and any k > 0 means a tile of value
 * 2^k. Storing exponents (rather than 2/4/8/…) keeps merges to a simple `+1`
 * and makes boards cheap to hash for the solver's transposition table.
 */

export const SIZE = 4;
export const CELL_COUNT = SIZE * SIZE;

/** Row-major array of 16 exponents. 0 = empty, k = tile value 2^k. */
export type Board = readonly number[];

/** The four legal slide directions. */
export type Direction = "up" | "down" | "left" | "right";

export const DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

/** Convert a stored exponent to its displayed tile value (0 stays 0). */
export function tileValue(exponent: number): number {
  return exponent === 0 ? 0 : 2 ** exponent;
}

/** A fresh board with every cell empty. */
export function createEmptyBoard(): Board {
  return new Array<number>(CELL_COUNT).fill(0);
}

/** Row/column index (0..3) for a flat cell index (0..15). */
export function rowOf(index: number): number {
  return Math.floor(index / SIZE);
}

export function colOf(index: number): number {
  return index % SIZE;
}

export function indexOf(row: number, col: number): number {
  return row * SIZE + col;
}

/** Flat indices of every empty cell, in ascending order. */
export function emptyCells(board: Board): number[] {
  const cells: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === 0) {
      cells.push(i);
    }
  }
  return cells;
}

export function countEmpty(board: Board): number {
  let n = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i] === 0) {
      n++;
    }
  }
  return n;
}

/** Largest exponent present on the board (0 for an empty board). */
export function maxExponent(board: Board): number {
  let max = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i] > max) {
      max = board[i];
    }
  }
  return max;
}

/** Return a copy of `board` with `index` set to `exponent`. */
export function withTile(board: Board, index: number, exponent: number): Board {
  const next = board.slice();
  next[index] = exponent;
  return next;
}

/** Structural equality of two boards. */
export function boardsEqual(a: Board, b: Board): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Build a board from a 4x4 grid of *tile values* (not exponents), e.g.
 * `[[2, 4, 0, 0], ...]`. Intended for tests and fixtures. Throws on shapes
 * that are not 4x4 or on values that are not 0 or a power of two.
 */
export function boardFromValues(rows: number[][]): Board {
  if (rows.length !== SIZE) {
    throw new Error(`Expected ${SIZE} rows, got ${rows.length}`);
  }
  const board = new Array<number>(CELL_COUNT).fill(0);
  for (let r = 0; r < SIZE; r++) {
    const row = rows[r];
    if (row.length !== SIZE) {
      throw new Error(`Row ${r} must have ${SIZE} columns, got ${row.length}`);
    }
    for (let c = 0; c < SIZE; c++) {
      board[indexOf(r, c)] = valueToExponent(row[c]);
    }
  }
  return board;
}

/** Inverse of {@link boardFromValues}: a 4x4 grid of tile values. */
export function boardToValues(board: Board): number[][] {
  const rows: number[][] = [];
  for (let r = 0; r < SIZE; r++) {
    const row: number[] = [];
    for (let c = 0; c < SIZE; c++) {
      row.push(tileValue(board[indexOf(r, c)]));
    }
    rows.push(row);
  }
  return rows;
}

function valueToExponent(value: number): number {
  if (value === 0) {
    return 0;
  }
  if (value < 2 || (value & (value - 1)) !== 0) {
    throw new Error(`Value ${value} is not 0 or a power of two`);
  }
  return Math.log2(value);
}

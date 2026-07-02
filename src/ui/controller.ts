/**
 * Game controller: the glue between the pure engine, the animated board view,
 * and the surrounding chrome (scoreboard, later the solver and auto-play).
 *
 * It owns the authoritative {@link GameState}, applies moves via the engine,
 * drives {@link BoardView} animations, persists the best score, and emits a
 * change event after every transition so other panels can react.
 */

import { type Direction } from "../engine/board.ts";
import { traceMove } from "../engine/moves.ts";
import { type GameState, newGame, step } from "../engine/game.ts";
import { type Rng, createRng } from "../engine/spawn.ts";
import { BoardView } from "./board.ts";

const BEST_SCORE_KEY = "2048-solver.best";

export interface GameChange {
  state: GameState;
  /** The move that produced this state, or null for a fresh game. */
  lastMove: Direction | null;
  best: number;
}

export type GameListener = (change: GameChange) => void;

export class GameController {
  private readonly view: BoardView;
  private readonly rng: Rng;
  private state: GameState;
  private best: number;
  private readonly listeners = new Set<GameListener>();

  constructor(boardElement: HTMLElement, seed = Date.now()) {
    this.view = new BoardView(boardElement);
    this.rng = createRng(seed);
    this.best = this.loadBest();
    this.state = newGame(this.rng);
    this.view.reset(this.state.board);
  }

  getState(): GameState {
    return this.state;
  }

  /** Show or clear the solver's recommended-move arrow on the board. */
  showHint(direction: Direction | null): void {
    this.view.showHint(direction);
  }

  getBest(): number {
    return this.best;
  }

  onChange(listener: GameListener): () => void {
    this.listeners.add(listener);
    // Fire immediately so late subscribers see current state.
    listener(this.snapshot(null));
    return () => this.listeners.delete(listener);
  }

  /** Start a fresh game and animate the opening position. */
  newGame(): void {
    this.state = newGame(this.rng);
    this.view.reset(this.state.board);
    this.emit(null);
  }

  /**
   * Attempt a move. Returns true if it was legal and applied. Illegal moves are
   * ignored (no animation, no event).
   */
  move(direction: Direction): boolean {
    if (this.state.over) {
      return false;
    }
    const traced = traceMove(this.state.board, direction);
    if (!traced.moved) {
      return false;
    }

    const result = step(this.state, direction, this.rng);
    this.state = result.state;
    this.view.animateMove(traced.traces, this.state.board, result.spawnIndex);

    if (this.state.score > this.best) {
      this.best = this.state.score;
      this.saveBest(this.best);
    }
    this.emit(direction);
    return true;
  }

  private emit(lastMove: Direction | null): void {
    const change = this.snapshot(lastMove);
    for (const listener of this.listeners) {
      listener(change);
    }
  }

  private snapshot(lastMove: Direction | null): GameChange {
    return { state: this.state, lastMove, best: this.best };
  }

  private loadBest(): number {
    try {
      const raw = localStorage.getItem(BEST_SCORE_KEY);
      return raw ? Number.parseInt(raw, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  private saveBest(value: number): void {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(value));
    } catch {
      // Ignore storage failures (private mode, quota, etc.).
    }
  }
}

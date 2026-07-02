/**
 * Animated board renderer.
 *
 * The board is a square container holding a static background grid and a layer
 * of absolutely-positioned tiles. Each tile is a 25%-square positioning box
 * translated by whole multiples of its own size, so `translate(col*100%,
 * row*100%)` lands it exactly on a cell and CSS transitions animate slides.
 *
 * On each move we drive the animation from the engine's {@link TileTrace} list:
 * every tile slides from its old cell to its new one, merged tiles fold onto
 * their partner, and the spawned tile pops in afterwards.
 */

import {
  type Board,
  type Direction,
  SIZE,
  colOf,
  rowOf,
  tileValue,
} from "../engine/board.ts";
import { type TileTrace } from "../engine/moves.ts";

const HINT_ARROWS: Record<Direction, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

const SLIDE_MS = 110;

interface LiveTile {
  el: HTMLElement;
  index: number;
  exponent: number;
}

export class BoardView {
  private readonly tileLayer: HTMLElement;
  private readonly hintEl: HTMLElement;
  private tiles: LiveTile[] = [];
  private idSeq = 0;
  /** Finalizer for the in-flight slide animation, if any. */
  private pendingFinalize: (() => void) | null = null;
  private pendingTimer: number | null = null;

  constructor(private readonly root: HTMLElement) {
    this.root.classList.add("board");
    this.root.innerHTML = "";

    const bg = document.createElement("div");
    bg.className = "grid-bg";
    for (let i = 0; i < SIZE * SIZE; i++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      bg.appendChild(cell);
    }
    this.root.appendChild(bg);

    this.tileLayer = document.createElement("div");
    this.tileLayer.className = "tile-layer";
    this.root.appendChild(this.tileLayer);

    this.hintEl = document.createElement("div");
    this.hintEl.className = "move-hint hidden";
    this.root.appendChild(this.hintEl);
  }

  /** Show a glowing arrow for the solver's recommended move (null hides it). */
  showHint(direction: Direction | null): void {
    if (!direction) {
      this.hintEl.classList.add("hidden");
      return;
    }
    this.hintEl.textContent = HINT_ARROWS[direction];
    this.hintEl.dataset.dir = direction;
    this.hintEl.classList.remove("hidden");
  }

  /** Clear all tiles and render `board` from scratch (used for new games). */
  reset(board: Board): void {
    this.cancelPending();
    this.tileLayer.innerHTML = "";
    this.tiles = [];
    for (let i = 0; i < board.length; i++) {
      if (board[i] !== 0) {
        this.tiles.push(this.createTile(i, board[i], "spawn"));
      }
    }
  }

  /**
   * Animate a move: slide existing tiles per `traces`, then reconcile against
   * `nextBoard` and pop in the tile spawned at `spawnIndex` (-1 for none).
   *
   * If a previous slide is still animating (fast auto-play can outpace the
   * animation), it is finalized synchronously first so the view never leaks
   * tiles or drifts out of sync with the board.
   */
  animateMove(traces: TileTrace[], nextBoard: Board, spawnIndex: number): void {
    this.finalizePending();

    // Match each trace to a live tile at its source cell and slide it.
    const remaining = [...this.tiles];
    const survivors: LiveTile[] = [];
    const mergedAway: LiveTile[] = [];

    for (const trace of traces) {
      const idx = remaining.findIndex(
        (t) => t.index === trace.from && t.exponent === trace.exponent,
      );
      const tile = idx >= 0 ? remaining.splice(idx, 1)[0] : undefined;
      if (!tile) {
        continue;
      }
      this.place(tile.el, trace.to);
      tile.index = trace.to;
      if (trace.merged) {
        mergedAway.push(tile);
      } else {
        survivors.push(tile);
      }
    }

    this.tiles = survivors;

    const finalize = (): void => {
      // Fold merged tiles into their partner and bump the survivor's value.
      for (const gone of mergedAway) {
        gone.el.remove();
      }
      for (const tile of this.tiles) {
        const target = nextBoard[tile.index];
        if (target !== tile.exponent) {
          tile.exponent = target;
          this.paintTile(tile.el, target);
          this.pop(tile.el, "merge");
        }
      }
      if (spawnIndex >= 0) {
        this.tiles.push(this.createTile(spawnIndex, nextBoard[spawnIndex], "spawn"));
      }
    };

    this.pendingFinalize = finalize;
    this.pendingTimer = setTimeout(() => this.finalizePending(), SLIDE_MS);
  }

  /** Run the pending slide finalizer now (if any), cancelling its timer. */
  private finalizePending(): void {
    if (this.pendingTimer !== null) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    const finalize = this.pendingFinalize;
    this.pendingFinalize = null;
    finalize?.();
  }

  /** Drop the pending slide finalizer without running it (used on reset). */
  private cancelPending(): void {
    if (this.pendingTimer !== null) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.pendingFinalize = null;
  }

  private createTile(index: number, exponent: number, pop: "spawn" | "merge"): LiveTile {
    const el = document.createElement("div");
    el.className = "tile";
    el.dataset.id = String(this.idSeq++);
    this.paintTile(el, exponent);
    this.place(el, index);
    this.tileLayer.appendChild(el);
    this.pop(el, pop);
    return { el, index, exponent };
  }

  private paintTile(el: HTMLElement, exponent: number): void {
    const value = tileValue(exponent);
    el.textContent = value === 0 ? "" : String(value);
    el.dataset.value = String(value);
    // Shrink font for longer numbers so they stay inside the tile.
    const digits = String(value).length;
    el.style.setProperty("--tile-font-scale", digits >= 4 ? "0.55" : digits === 3 ? "0.72" : "1");
  }

  private place(el: HTMLElement, index: number): void {
    el.style.transform = `translate(${colOf(index) * 100}%, ${rowOf(index) * 100}%)`;
  }

  private pop(el: HTMLElement, kind: "spawn" | "merge"): void {
    el.classList.remove("pop-spawn", "pop-merge");
    // Force reflow so re-adding the class restarts the animation.
    void el.offsetWidth;
    el.classList.add(kind === "spawn" ? "pop-spawn" : "pop-merge");
  }
}

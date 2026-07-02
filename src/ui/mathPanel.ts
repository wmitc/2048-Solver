/**
 * The "show the math" panel — the app's whole reason for being.
 *
 * For each of the four moves it renders a bar + numeric expected value, the
 * delta to the best move, the chance-node summary (how many spawn cells the
 * solver is averaging over, and the 90/10 split), and a live search-stats line
 * (depth, nodes, nodes/sec, cache hits, elapsed). Everything re-renders on every
 * streamed depth so the bars visibly settle as the search deepens.
 */

import { type Direction } from "../engine/board.ts";
import { type MoveEvaluation, type SearchResult } from "../solver/expectimax.ts";
import { SPAWN_TWO_PROBABILITY } from "../engine/spawn.ts";

const ARROWS: Record<Direction, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

const LABELS: Record<Direction, string> = {
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
};

/** Fixed display order so rows never reshuffle as EVs update. */
const ORDER: readonly Direction[] = ["up", "down", "left", "right"];

export interface MoveRow {
  direction: Direction;
  ev: number | null;
  legal: boolean;
  isBest: boolean;
  /** Bar fill 0–100, normalised across the legal moves. */
  barPct: number;
  /** EV minus the best legal EV (<= 0), or null when illegal. */
  delta: number | null;
}

/**
 * The worst legal move still gets a visible bar so ranking reads clearly
 * without an empty bar looking like a bug; the best move fills to 100%.
 */
const MIN_BAR_PCT = 25;

/**
 * Turn raw move evaluations into render-ready rows: normalise the bars across
 * the legal moves (best = 100%, worst = {@link MIN_BAR_PCT}%) and compute each
 * move's delta to the best. EVs within floating-point noise of each other are
 * treated as tied (all full bars) so a symmetric position doesn't render a
 * misleading 100/0 split. Pure, so it can be unit-tested without the DOM.
 */
export function computeMoveRows(moves: MoveEvaluation[], best: Direction | null): MoveRow[] {
  const evs = moves
    .map((m) => m.ev)
    .filter((ev): ev is number => ev !== null);
  const max = evs.length ? Math.max(...evs) : 0;
  const min = evs.length ? Math.min(...evs) : 0;
  const span = max - min;
  const tieEpsilon = Math.max(1e-9, Math.abs(max) * 1e-6);
  const tied = span <= tieEpsilon;

  const byDir = new Map(moves.map((m) => [m.direction, m]));
  return ORDER.map((direction) => {
    const move = byDir.get(direction);
    const ev = move?.ev ?? null;
    if (ev === null) {
      return { direction, ev: null, legal: false, isBest: false, barPct: 0, delta: null };
    }
    const barPct = tied
      ? 100
      : MIN_BAR_PCT + ((ev - min) / span) * (100 - MIN_BAR_PCT);
    return {
      direction,
      ev,
      legal: true,
      isBest: direction === best,
      barPct,
      delta: ev - max,
    };
  });
}

/** Compact number, e.g. 12_384 -> "12,384". */
export function formatCount(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** Throughput, e.g. 190_000 -> "190k/s", 2_100_000 -> "2.1M/s". */
export function formatRate(nodesPerSecond: number): string {
  if (!Number.isFinite(nodesPerSecond) || nodesPerSecond <= 0) {
    return "—";
  }
  if (nodesPerSecond >= 1_000_000) {
    return `${(nodesPerSecond / 1_000_000).toFixed(1)}M/s`;
  }
  if (nodesPerSecond >= 1_000) {
    return `${Math.round(nodesPerSecond / 1_000)}k/s`;
  }
  return `${Math.round(nodesPerSecond)}/s`;
}

/** Signed EV with a couple of significant digits, e.g. "+12.34", "−3.10". */
export function formatEv(ev: number): string {
  const magnitude = Math.abs(ev);
  const digits = magnitude >= 100 ? 0 : magnitude >= 10 ? 1 : 2;
  const text = ev.toFixed(digits);
  return text.replace("-", "−"); // proper minus sign
}

export class MathPanel {
  private readonly rows = new Map<Direction, {
    root: HTMLElement;
    fill: HTMLElement;
    value: HTMLElement;
    delta: HTMLElement;
  }>();

  private readonly chanceEl: HTMLElement;
  private readonly statsEl: HTMLElement;
  private readonly recommendEl: HTMLElement;

  constructor(private readonly root: HTMLElement) {
    this.root.classList.add("math-panel");
    this.root.innerHTML = "";

    const heading = document.createElement("div");
    heading.className = "math-heading";
    heading.innerHTML = `<h2>Solver EV by move</h2><p>Expectimax expected value — bars settle as the search deepens.</p>`;
    this.root.appendChild(heading);

    const rowsEl = document.createElement("div");
    rowsEl.className = "move-rows";
    for (const direction of ORDER) {
      const row = document.createElement("div");
      row.className = "move-row";
      row.dataset.dir = direction;

      const label = document.createElement("span");
      label.className = "move-label";
      label.innerHTML = `<span class="move-arrow">${ARROWS[direction]}</span><span class="move-name">${LABELS[direction]}</span>`;

      const bar = document.createElement("div");
      bar.className = "ev-bar";
      const fill = document.createElement("div");
      fill.className = "ev-fill";
      bar.appendChild(fill);

      const value = document.createElement("span");
      value.className = "ev-value";
      const delta = document.createElement("span");
      delta.className = "ev-delta";

      row.append(label, bar, value, delta);
      rowsEl.appendChild(row);
      this.rows.set(direction, { root: row, fill, value, delta });
    }
    this.root.appendChild(rowsEl);

    this.recommendEl = document.createElement("div");
    this.recommendEl.className = "recommendation";
    this.root.appendChild(this.recommendEl);

    this.chanceEl = document.createElement("div");
    this.chanceEl.className = "chance-summary";
    this.root.appendChild(this.chanceEl);

    this.statsEl = document.createElement("div");
    this.statsEl.className = "search-stats";
    this.root.appendChild(this.statsEl);

    this.clear();
  }

  /** Render a streamed search result. */
  render(result: SearchResult): void {
    const rows = computeMoveRows(result.moves, result.best);
    for (const row of rows) {
      const el = this.rows.get(row.direction);
      if (!el) {
        continue;
      }
      el.root.classList.toggle("illegal", !row.legal);
      el.root.classList.toggle("best", row.isBest);
      el.fill.style.width = `${row.barPct}%`;
      el.value.textContent = row.ev === null ? "—" : formatEv(row.ev);
      if (row.delta === null) {
        el.delta.textContent = "illegal";
      } else if (row.isBest) {
        el.delta.textContent = "best";
      } else {
        el.delta.textContent = formatEv(row.delta);
      }
    }

    if (result.best) {
      this.recommendEl.innerHTML = `Recommended <strong>${ARROWS[result.best]} ${LABELS[result.best]}</strong>`;
      this.recommendEl.classList.remove("terminal");
    } else {
      this.recommendEl.textContent = "No moves left";
      this.recommendEl.classList.add("terminal");
    }

    const two = Math.round(SPAWN_TWO_PROBABILITY * 100);
    this.chanceEl.textContent =
      `Chance nodes: averaging over ${result.stats.rootSpawnCells} spawn cells × ` +
      `{2: ${two}%, 4: ${100 - two}%}`;

    const { depth, nodes, cacheHits, elapsedMs } = result.stats;
    const rate = elapsedMs > 0 ? (nodes / elapsedMs) * 1000 : 0;
    this.statsEl.textContent =
      `depth ${depth} · ${formatCount(nodes)} nodes · ${formatRate(rate)} · ` +
      `${formatCount(cacheHits)} cache hits · ${elapsedMs.toFixed(1)} ms`;
  }

  /** Reset to an idle state (e.g. between games). */
  clear(): void {
    for (const el of this.rows.values()) {
      el.root.classList.remove("best", "illegal");
      el.fill.style.width = "0%";
      el.value.textContent = "—";
      el.delta.textContent = "";
    }
    this.recommendEl.textContent = "Thinking…";
    this.recommendEl.classList.remove("terminal");
    this.chanceEl.textContent = "";
    this.statsEl.textContent = "";
  }
}

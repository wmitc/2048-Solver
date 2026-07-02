/**
 * Auto-play controller.
 *
 * Watches the solver by itself: whenever an analysis finishes it plays the
 * recommended move after a speed-controlled delay, then the resulting position
 * is analysed and the loop repeats. It stops automatically when the game ends
 * (no recommended move) or when the user toggles it off.
 *
 * The controller doesn't run the solver itself — it's driven by the existing
 * analysis stream. Call {@link handleAnalysis} when a *final* search result is
 * ready; the controller schedules the next move from there.
 */

import { type Direction } from "../engine/board.ts";

/** Slowest / fastest step delays, in milliseconds, mapped from the slider. */
const SLOW_MS = 800;
const FAST_MS = 40;

/** Map a 0–100 speed-slider value to a step delay (0 = slow, 100 = fast). */
export function speedToDelayMs(sliderValue: number): number {
  const clamped = Math.max(0, Math.min(100, sliderValue));
  return Math.round(SLOW_MS - (clamped / 100) * (SLOW_MS - FAST_MS));
}

export interface AutoPlayerOptions {
  /** Play the given move; returns false if it was illegal (e.g. game over). */
  playMove: (direction: Direction) => boolean;
  /** Notified whenever the running state flips, for updating the toggle UI. */
  onRunningChange: (running: boolean) => void;
}

export class AutoPlayer {
  private running = false;
  private timer: number | null = null;
  private latestBest: Direction | null = null;
  private delayMs = speedToDelayMs(60);

  constructor(private readonly options: AutoPlayerOptions) {}

  isRunning(): boolean {
    return this.running;
  }

  setDelayFromSlider(sliderValue: number): void {
    this.delayMs = speedToDelayMs(sliderValue);
  }

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.options.onRunningChange(true);
    // Kick off immediately if we already have a recommendation to act on.
    if (this.latestBest !== null) {
      this.scheduleNext();
    }
  }

  stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    this.clearTimer();
    this.options.onRunningChange(false);
  }

  toggle(): void {
    if (this.running) {
      this.stop();
    } else {
      this.start();
    }
  }

  /**
   * Feed the controller the latest *final* analysis. Records the recommended
   * move and, if running, schedules it. A null recommendation means the game is
   * over, so auto-play stops.
   */
  handleAnalysis(best: Direction | null): void {
    this.latestBest = best;
    if (!this.running) {
      return;
    }
    if (best === null) {
      this.stop();
      return;
    }
    this.scheduleNext();
  }

  dispose(): void {
    this.clearTimer();
  }

  private scheduleNext(): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.running || this.latestBest === null) {
        return;
      }
      const moved = this.options.playMove(this.latestBest);
      if (!moved) {
        this.stop();
      }
      // A successful move triggers a fresh analysis; its final result calls
      // handleAnalysis(), which schedules the following move.
    }, this.delayMs);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

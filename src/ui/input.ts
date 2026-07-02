/**
 * Player input: arrow keys / WASD and touch swipes, normalised to a
 * {@link Direction} and delivered through a single callback.
 */

import { type Direction } from "../engine/board.ts";

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

const SWIPE_THRESHOLD_PX = 24;

export interface InputHandlers {
  onMove: (direction: Direction) => void;
}

/**
 * Wire up keyboard and touch input. Returns a disposer that removes every
 * listener it added.
 */
export function attachInput(
  boardElement: HTMLElement,
  handlers: InputHandlers,
): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    const direction = KEY_MAP[event.key];
    if (!direction) {
      return;
    }
    event.preventDefault();
    handlers.onMove(direction);
  };

  let startX = 0;
  let startY = 0;
  let tracking = false;

  const onTouchStart = (event: TouchEvent): void => {
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }
    startX = touch.clientX;
    startY = touch.clientY;
    tracking = true;
  };

  const onTouchEnd = (event: TouchEvent): void => {
    if (!tracking) {
      return;
    }
    tracking = false;
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    const direction = swipeDirection(dx, dy);
    if (direction) {
      event.preventDefault();
      handlers.onMove(direction);
    }
  };

  window.addEventListener("keydown", onKeyDown);
  boardElement.addEventListener("touchstart", onTouchStart, { passive: true });
  boardElement.addEventListener("touchend", onTouchEnd, { passive: false });

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    boardElement.removeEventListener("touchstart", onTouchStart);
    boardElement.removeEventListener("touchend", onTouchEnd);
  };
}

/** Resolve a swipe delta to a direction, or null if it was too short. */
export function swipeDirection(dx: number, dy: number): Direction | null {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (Math.max(absX, absY) < SWIPE_THRESHOLD_PX) {
    return null;
  }
  if (absX > absY) {
    return dx > 0 ? "right" : "left";
  }
  return dy > 0 ? "down" : "up";
}

import { describe, expect, it, vi } from "vitest";
import { AutoPlayer, speedToDelayMs } from "./autoplay.ts";

describe("speedToDelayMs", () => {
  it("maps slow (0) to a long delay and fast (100) to a short one", () => {
    expect(speedToDelayMs(0)).toBe(800);
    expect(speedToDelayMs(100)).toBe(40);
  });

  it("is monotonically decreasing and clamps out-of-range input", () => {
    expect(speedToDelayMs(50)).toBeLessThan(speedToDelayMs(0));
    expect(speedToDelayMs(50)).toBeGreaterThan(speedToDelayMs(100));
    expect(speedToDelayMs(-20)).toBe(speedToDelayMs(0));
    expect(speedToDelayMs(180)).toBe(speedToDelayMs(100));
  });
});

describe("AutoPlayer", () => {
  it("plays the recommended move after its delay while running", () => {
    vi.useFakeTimers();
    const playMove = vi.fn().mockReturnValue(true);
    const player = new AutoPlayer({ playMove, onRunningChange: () => {} });
    player.setDelayFromSlider(100); // 40ms

    player.start();
    player.handleAnalysis("left");
    expect(playMove).not.toHaveBeenCalled();

    vi.advanceTimersByTime(40);
    expect(playMove).toHaveBeenCalledWith("left");
    player.dispose();
    vi.useRealTimers();
  });

  it("does nothing until started", () => {
    vi.useFakeTimers();
    const playMove = vi.fn().mockReturnValue(true);
    const player = new AutoPlayer({ playMove, onRunningChange: () => {} });
    player.handleAnalysis("up");
    vi.advanceTimersByTime(1000);
    expect(playMove).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("stops when the game ends (null recommendation)", () => {
    const changes: boolean[] = [];
    const player = new AutoPlayer({
      playMove: () => true,
      onRunningChange: (r) => changes.push(r),
    });
    player.start();
    expect(player.isRunning()).toBe(true);
    player.handleAnalysis(null);
    expect(player.isRunning()).toBe(false);
    expect(changes).toEqual([true, false]);
  });

  it("stops when a scheduled move turns out to be illegal", () => {
    vi.useFakeTimers();
    const player = new AutoPlayer({
      playMove: () => false, // move rejected
      onRunningChange: () => {},
    });
    player.start();
    player.handleAnalysis("right");
    vi.advanceTimersByTime(1000);
    expect(player.isRunning()).toBe(false);
    vi.useRealTimers();
  });

  it("toggles between running and stopped", () => {
    const player = new AutoPlayer({ playMove: () => true, onRunningChange: () => {} });
    expect(player.isRunning()).toBe(false);
    player.toggle();
    expect(player.isRunning()).toBe(true);
    player.toggle();
    expect(player.isRunning()).toBe(false);
  });
});

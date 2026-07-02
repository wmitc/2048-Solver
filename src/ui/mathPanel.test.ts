import { describe, expect, it } from "vitest";
import { type MoveEvaluation } from "../solver/expectimax.ts";
import {
  computeMoveRows,
  formatCount,
  formatEv,
  formatRate,
} from "./mathPanel.ts";

describe("computeMoveRows", () => {
  it("normalises bars across legal moves and flags the best", () => {
    const moves: MoveEvaluation[] = [
      { direction: "up", ev: 10 },
      { direction: "down", ev: null },
      { direction: "left", ev: 30 },
      { direction: "right", ev: 20 },
    ];
    const rows = computeMoveRows(moves, "left");
    const byDir = Object.fromEntries(rows.map((r) => [r.direction, r]));

    expect(byDir.left.isBest).toBe(true);
    expect(byDir.left.barPct).toBe(100); // max
    expect(byDir.up.barPct).toBe(25); // min -> floor bar
    expect(byDir.right.barPct).toBeCloseTo(62.5, 5); // halfway between floor and full
    expect(byDir.left.delta).toBe(0);
    expect(byDir.right.delta).toBe(-10);
    expect(byDir.down.legal).toBe(false);
    expect(byDir.down.delta).toBeNull();
  });

  it("keeps a stable up/down/left/right order regardless of input order", () => {
    const moves: MoveEvaluation[] = [
      { direction: "right", ev: 1 },
      { direction: "left", ev: 2 },
      { direction: "up", ev: 3 },
      { direction: "down", ev: 4 },
    ];
    expect(computeMoveRows(moves, "down").map((r) => r.direction)).toEqual([
      "up",
      "down",
      "left",
      "right",
    ]);
  });

  it("gives every legal move a full bar when EVs are tied", () => {
    const moves: MoveEvaluation[] = [
      { direction: "up", ev: 5 },
      { direction: "down", ev: 5 },
      { direction: "left", ev: null },
      { direction: "right", ev: null },
    ];
    const rows = computeMoveRows(moves, "up");
    expect(rows.find((r) => r.direction === "up")?.barPct).toBe(100);
    expect(rows.find((r) => r.direction === "down")?.barPct).toBe(100);
  });
});

describe("formatting helpers", () => {
  it("formats counts with thousands separators", () => {
    expect(formatCount(12384)).toBe("12,384");
    expect(formatCount(5)).toBe("5");
  });

  it("formats node rates with sensible units", () => {
    expect(formatRate(190_000)).toBe("190k/s");
    expect(formatRate(2_100_000)).toBe("2.1M/s");
    expect(formatRate(0)).toBe("—");
    expect(formatRate(450)).toBe("450/s");
  });

  it("formats EVs with a real minus sign and scaled precision", () => {
    expect(formatEv(3.14159)).toBe("3.14");
    expect(formatEv(-3.1)).toBe("−3.10");
    expect(formatEv(-250.7)).toBe("−251");
  });
});

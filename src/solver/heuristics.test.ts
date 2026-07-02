import { describe, expect, it } from "vitest";
import { boardFromValues, createEmptyBoard } from "../engine/board.ts";
import {
  cornerMaxFeature,
  emptyFeature,
  evaluate,
  evaluateBreakdown,
  monotonicityFeature,
  smoothnessFeature,
} from "./heuristics.ts";

describe("emptyFeature", () => {
  it("counts empty cells", () => {
    expect(emptyFeature(createEmptyBoard())).toBe(16);
    expect(
      emptyFeature(
        boardFromValues([
          [2, 2, 2, 2],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ]),
      ),
    ).toBe(12);
  });
});

describe("monotonicityFeature", () => {
  it("is zero (no penalty) for perfectly monotonic columns", () => {
    const board = boardFromValues([
      [16, 16, 16, 16],
      [8, 8, 8, 8],
      [4, 4, 4, 4],
      [2, 2, 2, 2],
    ]);
    expect(monotonicityFeature(board)).toBe(0);
  });

  it("penalises zig-zagged lines", () => {
    const board = boardFromValues([
      [2, 16, 2, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(monotonicityFeature(board)).toBeLessThan(0);
  });
});

describe("smoothnessFeature", () => {
  it("is zero for a single tile and penalises mismatched neighbours", () => {
    const single = boardFromValues([
      [4, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(smoothnessFeature(single)).toBe(0);

    const rough = boardFromValues([
      [2, 256, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(smoothnessFeature(rough)).toBeLessThan(0);
  });
});

describe("cornerMaxFeature", () => {
  it("rewards the max tile only when it sits in a corner", () => {
    const inCorner = boardFromValues([
      [2048, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const inCentre = boardFromValues([
      [0, 0, 0, 0],
      [0, 2048, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(cornerMaxFeature(inCorner)).toBe(11); // exponent of 2048
    expect(cornerMaxFeature(inCentre)).toBe(0);
  });
});

describe("evaluate", () => {
  it("prefers an open, corner-anchored board over a scattered one", () => {
    const tidy = boardFromValues([
      [64, 32, 8, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const messy = boardFromValues([
      [2, 64, 4, 32],
      [16, 2, 8, 4],
      [4, 32, 2, 16],
      [2, 8, 4, 2],
    ]);
    expect(evaluate(tidy)).toBeGreaterThan(evaluate(messy));
  });

  it("breakdown components sum to the total", () => {
    const board = boardFromValues([
      [64, 32, 8, 2],
      [4, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const b = evaluateBreakdown(board);
    expect(b.empty + b.monotonicity + b.smoothness + b.cornerMax).toBeCloseTo(
      b.total,
      6,
    );
  });
});

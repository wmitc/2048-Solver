import { describe, expect, it } from "vitest";
import { boardFromValues, indexOf } from "./board.ts";
import { traceMove } from "./moves.ts";

describe("traceMove", () => {
  it("returns no traces for an illegal move", () => {
    const board = boardFromValues([
      [2, 4, 2, 4],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(traceMove(board, "left").traces).toEqual([]);
  });

  it("traces a simple slide with no merge", () => {
    const board = boardFromValues([
      [0, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const { traces } = traceMove(board, "left");
    expect(traces).toEqual([
      { from: indexOf(0, 3), to: indexOf(0, 0), exponent: 1, merged: false },
    ]);
  });

  it("emits paired traces for a merge sharing one destination", () => {
    const board = boardFromValues([
      [2, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
    const { traces } = traceMove(board, "left");
    expect(traces).toHaveLength(2);
    const dest = indexOf(0, 0);
    expect(traces[0]).toEqual({ from: indexOf(0, 0), to: dest, exponent: 1, merged: false });
    expect(traces[1]).toEqual({ from: indexOf(0, 3), to: dest, exponent: 1, merged: true });
  });

  it("covers every non-empty source tile exactly once", () => {
    const board = boardFromValues([
      [2, 2, 4, 4],
      [8, 0, 8, 0],
      [0, 0, 0, 0],
      [2, 4, 8, 16],
    ]);
    const { traces } = traceMove(board, "left");
    const sources = traces.map((t) => t.from).sort((a, b) => a - b);
    const expected = [
      indexOf(0, 0), indexOf(0, 1), indexOf(0, 2), indexOf(0, 3),
      indexOf(1, 0), indexOf(1, 2),
      indexOf(3, 0), indexOf(3, 1), indexOf(3, 2), indexOf(3, 3),
    ].sort((a, b) => a - b);
    expect(sources).toEqual(expected);
  });
});

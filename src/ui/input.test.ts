import { describe, expect, it } from "vitest";
import { swipeDirection } from "./input.ts";

describe("swipeDirection", () => {
  it("ignores short swipes below the threshold", () => {
    expect(swipeDirection(5, -3)).toBeNull();
    expect(swipeDirection(0, 0)).toBeNull();
  });

  it("resolves the dominant axis", () => {
    expect(swipeDirection(60, 10)).toBe("right");
    expect(swipeDirection(-60, 10)).toBe("left");
    expect(swipeDirection(10, 60)).toBe("down");
    expect(swipeDirection(10, -60)).toBe("up");
  });

  it("prefers the larger component on diagonal swipes", () => {
    expect(swipeDirection(40, -30)).toBe("right");
    expect(swipeDirection(-30, 40)).toBe("down");
  });
});

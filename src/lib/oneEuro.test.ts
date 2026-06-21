import { describe, expect, it } from "vitest";
import { OneEuroFilter } from "./oneEuro.ts";

describe("OneEuroFilter", () => {
  it("passes the first sample through unchanged", () => {
    const f = new OneEuroFilter();
    expect(f.filter(42, 1 / 60)).toBe(42);
  });

  it("converges toward a held constant", () => {
    const f = new OneEuroFilter();
    f.filter(0, 1 / 60);
    let last = 0;
    for (let i = 0; i < 200; i++) last = f.filter(100, 1 / 60);
    expect(last).toBeGreaterThan(99);
    expect(last).toBeLessThanOrEqual(100);
  });

  it("lags a step less when beta is higher (more responsive)", () => {
    const dt = 1 / 60;
    const calm = new OneEuroFilter(0.6, 0);
    const snappy = new OneEuroFilter(0.6, 5);
    calm.filter(0, dt);
    snappy.filter(0, dt);
    // First reaction to a large jump: the high-beta filter opens its cutoff and
    // moves further on the same sample.
    const calmStep = calm.filter(100, dt);
    const snappyStep = snappy.filter(100, dt);
    expect(snappyStep).toBeGreaterThan(calmStep);
  });

  it("resets to a fresh state", () => {
    const f = new OneEuroFilter();
    f.filter(10, 1 / 60);
    f.reset();
    expect(f.filter(77, 1 / 60)).toBe(77);
  });
});

import { describe, expect, it } from "vitest";
import { fft, floorPow2, princarg } from "./fft.ts";

describe("floorPow2", () => {
  it("returns the largest power of two <= n", () => {
    expect(floorPow2(1)).toBe(1);
    expect(floorPow2(2)).toBe(2);
    expect(floorPow2(3)).toBe(2);
    expect(floorPow2(8192)).toBe(8192);
    expect(floorPow2(8191)).toBe(4096);
  });
});

describe("princarg", () => {
  it("wraps phase to within ±π", () => {
    expect(princarg(0)).toBeCloseTo(0, 9);
    expect(princarg(Math.PI / 2)).toBeCloseTo(Math.PI / 2, 9);
    expect(princarg(2 * Math.PI + 0.3)).toBeCloseTo(0.3, 9);
    expect(princarg(-2 * Math.PI - 0.3)).toBeCloseTo(-0.3, 9);
    // Exact odd multiples of π land on the -π boundary.
    expect(Math.abs(princarg(3 * Math.PI))).toBeCloseTo(Math.PI, 9);
  });
});

describe("fft", () => {
  it("puts a pure sinusoid's energy in its bin", () => {
    const n = 64;
    const bin = 5;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    for (let i = 0; i < n; i++) re[i] = Math.cos((2 * Math.PI * bin * i) / n);
    fft(re, im);

    const mag = (k: number) => Math.hypot(re[k], im[k]);
    let peak = 1;
    for (let k = 1; k <= n / 2; k++) if (mag(k) > mag(peak)) peak = k;
    expect(peak).toBe(bin);
    // Real cosine → half the energy in bin, half in its mirror; neighbours quiet.
    expect(mag(bin)).toBeCloseTo(n / 2, 4);
    expect(mag(bin - 1)).toBeLessThan(1e-6);
  });

  it("matches a naive DFT", () => {
    const n = 16;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    for (let i = 0; i < n; i++) re[i] = Math.sin(i) + 0.5 * Math.cos(3 * i);
    const input = Array.from(re);

    fft(re, im);

    for (let k = 0; k < n; k++) {
      let dr = 0;
      let di = 0;
      for (let i = 0; i < n; i++) {
        const ang = (-2 * Math.PI * k * i) / n;
        dr += input[i] * Math.cos(ang);
        di += input[i] * Math.sin(ang);
      }
      expect(re[k]).toBeCloseTo(dr, 4);
      expect(im[k]).toBeCloseTo(di, 4);
    }
  });
});

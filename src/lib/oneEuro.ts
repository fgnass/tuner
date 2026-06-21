/**
 * One-Euro filter (Casiez, Roussel & Vogel, CHI 2012).
 *
 * An adaptive low-pass: it smooths hard when the signal is steady and barely at
 * all when the signal is moving fast. That single trade-off is exactly what a
 * fixed EMA or moving average cannot make — a static filter is either sticky
 * (lags your fine peg-turns and resists small changes near the centre) or jumpy
 * (jitters at rest and overshoots). Here a held note sits rock-still so you can
 * read the exact cents, yet the needle still tracks a deliberate adjustment with
 * almost no lag.
 *
 * The cutoff frequency rises with the (low-pass-filtered) speed of change:
 *   cutoff = minCutoff + beta · |velocity|
 * Feed it values in a perceptually-even domain (cents) so the dynamics are the
 * same for a low E and a high E.
 */
export class OneEuroFilter {
  private xPrev: number | null = null;
  private dxPrev = 0;

  /**
   * @param minCutoff Cutoff (Hz) at rest — lower means smoother/stiller.
   * @param beta Speed coefficient — higher means more responsive to motion.
   * @param dCutoff Cutoff (Hz) for the internal velocity estimate.
   */
  constructor(
    private minCutoff = 0.6,
    private beta = 0.05,
    private dCutoff = 1.0,
  ) {}

  reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
  }

  /**
   * @param x New sample.
   * @param dt Seconds since the previous sample.
   */
  filter(x: number, dt: number): number {
    if (this.xPrev === null || dt <= 0) {
      this.xPrev = x;
      this.dxPrev = 0;
      return x;
    }
    const dx = (x - this.xPrev) / dt;
    const dxHat = this.dxPrev + smoothingAlpha(this.dCutoff, dt) * (dx - this.dxPrev);
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const xHat = this.xPrev + smoothingAlpha(cutoff, dt) * (x - this.xPrev);
    this.xPrev = xHat;
    this.dxPrev = dxHat;
    return xHat;
  }
}

/** Exponential-smoothing factor for a given cutoff frequency and timestep. */
function smoothingAlpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

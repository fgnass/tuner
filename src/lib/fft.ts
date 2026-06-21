/**
 * In-place iterative radix-2 Cooley–Tukey FFT operating on split
 * real/imaginary arrays (length must be a power of two).
 *
 * This is the spectral workhorse behind the harmonic-refinement stage: a
 * forward transform per frame gives us the complex spectrum we need both for
 * harmonic peak magnitudes and for the phase-difference (instantaneous-
 * frequency) trick that sharpens each peak well below the bin spacing.
 */
export function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if (n <= 1) return;

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }

  // Butterfly stages.
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = a + half;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/** Largest power of two that is <= `n`. */
export function floorPow2(n: number): number {
  let p = 1;
  while (p << 1 <= n) p <<= 1;
  return p;
}

/** Principal argument: wrap a phase into [-π, π). */
export function princarg(phase: number): number {
  return phase - 2 * Math.PI * Math.round(phase / (2 * Math.PI));
}

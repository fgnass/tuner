import { useSignal } from "@preact/signals";
import { useCallback, useEffect, useRef } from "preact/hooks";
import { OneEuroFilter } from "../lib/oneEuro";
import { createPitchDetector } from "../lib/pitch";

export type MicStatus = "idle" | "requesting" | "listening" | "denied" | "error";

export interface Reading {
  /** Smoothed fundamental in Hz, or -1 when nothing is detected. */
  freq: number;
}

const NO_READING: Reading = { freq: -1 };

/**
 * Capture window. Larger than a single FFT frame so the detector has headroom
 * both for YIN's integration window and the offset second window used by the
 * phase-difference refinement; 8192 also gives the resolution low instruments
 * (bass) need.
 */
const CAPTURE_SIZE = 8192;
/** Run detection at most this often (ms) — decoupled from the 60 fps render. */
const DETECT_INTERVAL_MS = 40;
/** Keep showing the last good reading this long after the signal drops (ms). */
const HOLD_MS = 700;
/**
 * Only let the reading *move* when YIN is this confident. A pluck's attack is
 * unpitched and low-confidence, so this gates out the chaotic transient — the
 * needle holds steady through it and only tracks the settled, sustained tone.
 */
const CLARITY_GATE = 0.9;
/** A jump larger than this (cents) is a new note → snap instead of gliding. */
const NEW_NOTE_CENTS = 250;
/**
 * Stability gate. A played string holds a steady pitch; speech and background
 * chatter slide around constantly. So we only trust a reading once the last
 * `STABILITY_WINDOW` raw detections agree to within `STABILITY_CENTS`. This is
 * what keeps people talking nearby from driving the needle — and it replaces the
 * consistency check that the old outlier-rejecting smoother used to provide.
 * Slow peg-turns stay within the tolerance; a fast crank may briefly drop out.
 */
const STABILITY_WINDOW = 5; // ~200 ms at the detection rate
const STABILITY_CENTS = 20;
/** Keep harmonics for the spectral refinement; only cut hiss above this (Hz). */
const LOWPASS_HZ = 5000;

// One-Euro filter tuning (operating in the cents domain). minCutoff sets the
// stillness at rest (lower = steadier readout you can read precisely); beta sets
// how quickly it opens up when you actually move the pitch (higher = snappier).
const EURO_MIN_CUTOFF = 0.6;
const EURO_BETA = 0.06;

export interface PitchRange {
  min: number;
  max: number;
}

/**
 * @param range Instrument pitch bounds — narrows the search and the input
 *   filter band, which hardens octave decisions and rejects out-of-range noise.
 */
export function usePitch(range: PitchRange) {
  const status = useSignal<MicStatus>("idle");
  const reading = useSignal<Reading>(NO_READING);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const smoothedRef = useRef<number>(-1);
  const lastGoodAtRef = useRef<number>(0);
  const lastDetectAtRef = useRef<number>(0);
  const lastFilterAtRef = useRef<number>(0);
  const recentCentsRef = useRef<number[]>([]); // raw detections, for the stability gate

  // Detector, smoothing filter and audio nodes live in refs so they can be
  // rebuilt on an instrument change without tearing down the microphone stream.
  const detectorRef = useRef(createPitchDetector({ minFreq: range.min, maxFreq: range.max }));
  const filterRef = useRef(new OneEuroFilter(EURO_MIN_CUTOFF, EURO_BETA));
  const highpassRef = useRef<BiquadFilterNode | null>(null);
  const lowpassRef = useRef<BiquadFilterNode | null>(null);
  const rangeRef = useRef(range);

  // React to instrument/range changes while listening.
  useEffect(() => {
    rangeRef.current = range;
    detectorRef.current = createPitchDetector({
      minFreq: range.min,
      maxFreq: range.max,
    });
    filterRef.current.reset();
    recentCentsRef.current.length = 0;
    smoothedRef.current = -1;
    if (highpassRef.current) highpassRef.current.frequency.value = Math.max(20, range.min * 0.7);
    if (lowpassRef.current) lowpassRef.current.frequency.value = LOWPASS_HZ;
  }, [range.min, range.max]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    for (const t of streamRef.current?.getTracks() ?? []) t.stop();
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    highpassRef.current = null;
    lowpassRef.current = null;
    filterRef.current.reset();
    recentCentsRef.current.length = 0;
    smoothedRef.current = -1;
    lastFilterAtRef.current = 0;
    reading.value = NO_READING;
    status.value = "idle";
  }, []);

  const start = useCallback(async () => {
    if (ctxRef.current) return;
    // getUserMedia is only exposed in a secure context (HTTPS or localhost).
    if (!navigator.mediaDevices?.getUserMedia) {
      status.value = "error";
      return;
    }
    status.value = "requesting";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      await ctx.resume();
      ctxRef.current = ctx;

      // source → high-pass (kill rumble) → low-pass (kill hiss, keep harmonics)
      // → analyser.
      const source = ctx.createMediaStreamSource(stream);
      const highpass = ctx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = Math.max(20, rangeRef.current.min * 0.7);
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = LOWPASS_HZ;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = CAPTURE_SIZE;
      source.connect(highpass).connect(lowpass).connect(analyser);
      highpassRef.current = highpass;
      lowpassRef.current = lowpass;

      const buffer = new Float32Array(analyser.fftSize);
      status.value = "listening";

      const loop = () => {
        const now = performance.now();
        if (now - lastDetectAtRef.current >= DETECT_INTERVAL_MS) {
          lastDetectAtRef.current = now;
          analyser.getFloatTimeDomainData(buffer);
          const result = detectorRef.current.detect(buffer, ctx.sampleRate);

          // Stability gate: collect recent raw detections and require them to
          // agree before trusting the signal — a steady note passes, wandering
          // speech does not.
          const hist = recentCentsRef.current;
          let stable = false;
          if (result.freq > 0 && result.clarity >= CLARITY_GATE) {
            hist.push(1200 * Math.log2(result.freq));
            while (hist.length > STABILITY_WINDOW) hist.shift();
            stable =
              hist.length >= STABILITY_WINDOW &&
              Math.max(...hist) - Math.min(...hist) <= STABILITY_CENTS;
          } else {
            hist.length = 0; // signal gone — require a fresh stable run next time
          }

          if (stable) {
            const prev = smoothedRef.current;
            const f = octaveSnap(result.freq, prev);
            const jump = prev > 0 ? Math.abs(1200 * Math.log2(f / prev)) : Infinity;
            // A real jump is a new note → snap (reset the filter) instead of
            // gliding across. The `prev > 0` guard stops this firing before the
            // first reading exists.
            if (prev > 0 && jump > NEW_NOTE_CENTS) {
              filterRef.current.reset();
              lastFilterAtRef.current = 0;
            }

            // Filter in the cents domain so the dynamics are identical across the
            // range. dt is the real elapsed time since the last accepted frame.
            const dt =
              lastFilterAtRef.current > 0
                ? Math.min(0.2, (now - lastFilterAtRef.current) / 1000)
                : DETECT_INTERVAL_MS / 1000;
            lastFilterAtRef.current = now;
            const smoothedCents = filterRef.current.filter(1200 * Math.log2(f), dt);
            smoothedRef.current = 2 ** (smoothedCents / 1200);
            lastGoodAtRef.current = now;
            reading.value = { freq: smoothedRef.current };
          } else if (now - lastGoodAtRef.current > HOLD_MS) {
            filterRef.current.reset();
            smoothedRef.current = -1;
            lastFilterAtRef.current = 0;
            reading.value = NO_READING;
          }
          // Otherwise (low confidence within the hold window): keep the last
          // reading so the trace stays put through attacks and brief dropouts.
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      // A failure partway through (e.g. AudioContext threw after the stream was
      // granted) can leave the mic track live — release everything.
      stop();
      const denied = err instanceof DOMException && err.name === "NotAllowedError";
      status.value = denied ? "denied" : "error";
    }
  }, [stop]);

  useEffect(() => () => stop(), [stop]);

  return { status: status.value, reading: reading.value, start, stop };
}

/**
 * Snap a near-exact octave error back onto the current octave ("sticky" octave).
 * Only triggers within a semitone of a true octave, so real pitch changes and
 * non-octave intervals (e.g. a fifth) pass through untouched.
 */
function octaveSnap(freq: number, current: number): number {
  if (current <= 0) return freq;
  const semis = 12 * Math.log2(freq / current);
  const oct = Math.round(semis / 12);
  if (oct !== 0 && Math.abs(semis - oct * 12) < 1) {
    return freq / 2 ** oct;
  }
  return freq;
}

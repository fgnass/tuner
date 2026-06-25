import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { noteFromName } from "../lib/notes";
import type { MicStatus, Reading } from "./usePitch";

/**
 * Staging mode for screenshots and demos. When the page is loaded with `?demo`
 * in the query string, the app skips the microphone entirely and this hook
 * feeds a scripted pitch curve straight into the normal rendering pipeline —
 * so the captured frame is the real `TunerDisplay`, not a mockup, and stays
 * correct as the UI evolves. See `scripts/screenshot.mjs`.
 *
 * The curve is driven by **frame count**, not wall-clock time. The rolling
 * trail in `useTunerTrail` records exactly one sample per animation frame, so
 * advancing the curve per frame keeps the two perfectly in step regardless of
 * the (variable, often throttled) frame rate in a headless browser. That makes
 * the captured shape deterministic.
 *
 * Knobs (all optional query params):
 *   ?demo            enable staging
 *   &note=A2         which string to tune toward (scientific pitch notation)
 *   &cents=7         where the curve settles (a few cents sharp reads as
 *                    "actively tuning": big number + hint, not the in-tune glow)
 */

const NO_READING: Reading = { freq: -1 };

/** Where the "turn the peg" gesture starts, in cents sharp. */
const START_CENTS = 44;
/** Frames spent sweeping from START_CENTS to the settle value. */
const GESTURE_FRAMES = 350;
/**
 * Frame at which the trail is full of the gesture (+ a short steady hold at the
 * head) and the page is ready to capture. The trail keeps 380 frames, so by
 * here the visible window runs from early in the gesture up to the settled head.
 */
const READY_FRAME = 400;

/** Set on `window` once the staged frame is ready; the screenshot script waits on it. */
const READY_FLAG = "__tunerDemoReady";

declare global {
  interface Window {
    [READY_FLAG]?: boolean;
  }
}

export interface DemoConfig {
  note: string;
  settle: number;
}

/** Parse demo staging config from the URL, or null when not in demo mode. */
export function readDemoConfig(): DemoConfig | null {
  if (typeof location === "undefined") return null;
  const params = new URLSearchParams(location.search);
  if (!params.has("demo")) return null;
  const cents = Number(params.get("cents"));
  return {
    note: params.get("note") ?? "A2",
    settle: params.get("cents") !== null && Number.isFinite(cents) ? cents : 7,
  };
}

/**
 * Cents at animation frame `n`: a smooth descent from {@link START_CENTS} to
 * `settle` with a gentle, fading wobble. It approaches the target from the
 * sharp side and never crosses into the in-tune band, so the readout shows the
 * big number + "TUNE DOWN" hint (the "actively tuning" look) with no one-shot
 * lock-in flashes left in the frame.
 */
function curveCents(n: number, settle: number): number {
  const p = Math.min(1, n / GESTURE_FRAMES);
  const ease = p * p * (3 - 2 * p); // smoothstep
  const base = START_CENTS + (settle - START_CENTS) * ease;
  // Larger, livelier wobble early; fades to nothing as it settles.
  const wobble = (4.5 * Math.cos(n * 0.14) + 2 * Math.cos(n * 0.37 + 1)) * (1 - ease);
  return base + wobble;
}

/**
 * Drop-in replacement for {@link usePitch} used only in demo mode. Returns the
 * same shape so `App` can swap it in transparently.
 */
export function useDemoTuner(config: DemoConfig | null) {
  const reading = useSignal<Reading>(NO_READING);
  const status = useSignal<MicStatus>("idle");

  // Driven off the primitive config fields, not the object identity (which is
  // rebuilt every render).
  useEffect(() => {
    if (!config) return;
    const targetFreq = noteFromName(config.note).freq;
    status.value = "listening";

    let raf = 0;
    let frame = 0;
    const tick = () => {
      const cents = curveCents(frame, config.settle);
      reading.value = { freq: targetFreq * 2 ** (cents / 1200) };
      if (frame === READY_FRAME) window[READY_FLAG] = true;
      frame++;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window[READY_FLAG] = false;
      status.value = "idle";
      reading.value = NO_READING;
    };
  }, [config?.note, config?.settle]);

  const noop = () => {};
  return { status: status.value, reading: reading.value, start: noop, stop: noop };
}

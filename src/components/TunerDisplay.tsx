import { useEffect, useRef } from "preact/hooks";
import type { Note } from "../lib/notes";

interface Props {
  target: Note | null;
  /** Cents deviation from the target, or null when no signal. */
  cents: number | null;
  inTune: boolean;
}

/** Cents range mapped across the strip width; readings beyond this clamp. */
const RANGE = 50;
/**
 * Non-linear sensitivity for the needle position. The cents→position mapping is
 * compressed near the centre (exponent > 1), so the small residual jitter of an
 * in-tune note barely moves the needle, while larger deviations still swing it
 * clearly — and the needle eases gently into centre instead of twitching there.
 * Endpoints are unchanged: ±RANGE cents still map to the full width.
 */
const CURVE = 1.5;
/** Samples kept in the rolling trail (more = longer history + slower scroll). */
const TRAIL = 380;
/**
 * Per-frame easing toward the live reading — lower = smoother/slower. The pitch
 * is already adaptively smoothed upstream (One-Euro filter), so this only needs
 * to interpolate the ~25 Hz detection updates up to 60 fps; keep it fairly high
 * to avoid stacking a second lag on top.
 */
const EASE = 0.3;
/** Fraction of height where the trail begins (just below the needle tip). */
const TOP_FRAC = 0.33;
/** Cents at which the trail colour reaches full red. */
const COLOR_SPREAD = 35;

interface Sample {
  x: number;
  cents: number;
  on: boolean;
}

/** Horizontal half-travel of the needle, as a fraction of width. Leaves a ~6%
 * margin on each edge so the trail never touches the rim at full deflection. */
const HALF_TRAVEL = 0.44;

function clampX(cents: number): number {
  const c = Math.max(-RANGE, Math.min(RANGE, cents)) / RANGE; // -1..1
  const shaped = Math.sign(c) * Math.abs(c) ** CURVE;
  return 0.5 + shaped * HALF_TRAVEL;
}

/** Peach (in tune) → coral red (far off), by absolute cents. */
function hueFor(absCents: number): string {
  const t = Math.min(1, absCents / COLOR_SPREAD);
  const h = 28 - 36 * t; // peach ~28° rotating toward red
  const s = 93 - 6 * t;
  const l = 72 - 9 * t;
  return `hsl(${h} ${s}% ${l}%)`;
}

function fmtCents(c: number): string {
  const r = Math.round(c);
  return r > 0 ? `+${r}` : `${r}`;
}

export function TunerDisplay({ target, cents, inTune }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);

  // Latest reading, read imperatively by the animation loop each frame.
  const liveRef = useRef({ cents, inTune });
  liveRef.current = { cents, inTune };

  const trailRef = useRef<Sample[]>([]);
  const dispRef = useRef(0); // eased cents
  const scrollRef = useRef(0); // rolling-paper offset

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const { cents, inTune } = liveRef.current;
      const active = cents !== null;
      // Ease toward the live reading; pin to dead centre when in tune (so the
      // trace renders as a flat line and the last bit of jitter disappears), or
      // recentre when the signal drops.
      const aim = active && !inTune ? cents : 0;
      dispRef.current += (aim - dispRef.current) * EASE;
      const x = clampX(dispRef.current);

      const trail = trailRef.current;
      trail.push({ x, cents: Math.abs(dispRef.current), on: active });
      if (trail.length > TRAIL) trail.shift();

      ctx.clearRect(0, 0, w, h);

      const top = h * TOP_FRAC;
      const usable = h - top;
      const gap = usable / (TRAIL - 1);
      const n = trail.length;
      const yOf = (i: number) => top + (n - 1 - i) * gap; // newest at top

      // Graph-paper grid: vertical rules stay put (parallel to the scroll),
      // horizontal rules roll downward — so the plot reads as moving paper.
      const GRID = 46;
      scrollRef.current = (scrollRef.current + gap) % GRID;
      ctx.strokeStyle = "rgba(250,174,123,0.05)";
      ctx.lineWidth = 1;
      for (let y = scrollRef.current; y < h; y += GRID) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let x = (0.5 * w) % GRID; x < w; x += GRID) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (let i = 1; i < n; i++) {
        const a = trail[i - 1];
        const b = trail[i];
        if (!a.on || !b.on) continue;
        const age = n - 1 - i;
        ctx.globalAlpha = Math.max(0.04, 1 - age / TRAIL);
        ctx.strokeStyle = hueFor(b.cents);
        ctx.beginPath();
        ctx.moveTo(a.x * w, yOf(i - 1));
        ctx.lineTo(b.x * w, yOf(i));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Drive the needle imperatively so it stays glued to the trail head.
      const needle = needleRef.current;
      if (needle) {
        needle.style.left = `${x * 100}%`;
        needle.style.opacity = active ? "1" : "0.55";
        // Match the readout + nib to the trail head's current colour.
        needle.style.color = hueFor(Math.abs(dispRef.current));
      }
      if (numRef.current && active && !inTune) {
        numRef.current.textContent = fmtCents(dispRef.current);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const active = cents !== null;
  const mode = !active ? "idle" : inTune ? "intune" : "off";
  const instruction = inTune ? "" : !active ? "" : cents! > 0 ? "Tune down" : "Tune up";

  return (
    <div class="display">
      <canvas ref={canvasRef} />
      <div class={inTune ? "centerline lit" : "centerline"} />

      <span class="accidental flat">♭</span>
      <span class="accidental sharp">♯</span>

      {inTune && <div class="tune-flash" />}
      {inTune && <div class="bloom" />}

      <div ref={needleRef} class={`needle ${mode}`}>
        {mode === "off" ? (
          <span class="needle-num" ref={numRef}>
            {fmtCents(cents!)}
          </span>
        ) : null}
        {instruction && <div class="needle-hint">{instruction}</div>}
        <svg class="needle-nib" viewBox="0 0 42 48" fill="none" aria-hidden="true">
          <path
            fill="currentColor"
            d="M26.405 44c-2.41 2.72-4.25 4-5.63 4s-3.22-1.32-5.63-4C8.615 36.58-.805 20 .055 13a13.06 13.06 0 0 1 6.45-9.87C9.865 1.08 14.395 0 19.585 0h2.37c5.2 0 9.73 1.08 13.09 3.13a13.06 13.06 0 0 1 6.45 9.87c.86 7-8.56 23.58-15.09 31"
          />
        </svg>
      </div>

      {target && (
        <div class={inTune ? "note-circle in-tune" : "note-circle"}>
          {target.name}
          <sup>{target.octave}</sup>
        </div>
      )}
    </div>
  );
}

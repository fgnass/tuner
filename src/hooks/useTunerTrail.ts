import { useEffect, useRef } from "preact/hooks";

interface UseTunerTrailOptions {
  cents: number | null;
  inTune: boolean;
}

interface Sample {
  x: number;
  cents: number;
  on: boolean;
}

/** Cents range mapped across the strip width; readings beyond this clamp. */
const RANGE = 50;
/** Non-linear sensitivity for the needle position. */
const CURVE = 1.5;
/** Samples kept in the rolling trail. */
const TRAIL = 380;
/** Per-frame easing toward the live reading. */
const EASE = 0.3;
/** Fraction of height where the trail begins. */
const TOP_FRAC = 0.33;
/** Cents at which the trail colour reaches full red. */
const COLOR_SPREAD = 35;
/** Horizontal half-travel of the needle, as a fraction of width. */
const HALF_TRAVEL = 0.44;

function clampX(cents: number): number {
  const c = Math.max(-RANGE, Math.min(RANGE, cents)) / RANGE;
  const shaped = Math.sign(c) * Math.abs(c) ** CURVE;
  return 0.5 + shaped * HALF_TRAVEL;
}

/** Peach (in tune) -> coral red (far off), by absolute cents. */
function hueFor(absCents: number): string {
  const t = Math.min(1, absCents / COLOR_SPREAD);
  const h = 28 - 36 * t;
  const s = 93 - 6 * t;
  const l = 72 - 9 * t;
  return `hsl(${h} ${s}% ${l}%)`;
}

export function fmtCents(c: number): string {
  const r = Math.round(c);
  return r > 0 ? `+${r}` : `${r}`;
}

export function useTunerTrail({ cents, inTune }: UseTunerTrailOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);

  const liveRef = useRef({ cents, inTune });
  liveRef.current = { cents, inTune };

  const trailRef = useRef<Sample[]>([]);
  const dispRef = useRef(0);
  const scrollRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let gridColor = "rgba(250,174,123,0.05)";
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
      gridColor =
        getComputedStyle(document.documentElement).getPropertyValue("--grid").trim() || gridColor;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const { cents, inTune } = liveRef.current;
      const active = cents !== null;
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
      const yOf = (i: number) => top + (n - 1 - i) * gap;

      const grid = 46;
      scrollRef.current = (scrollRef.current + gap) % grid;
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      for (let y = scrollRef.current; y < h; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let x = (0.5 * w) % grid; x < w; x += grid) {
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

      const needle = needleRef.current;
      if (needle) {
        needle.style.left = `${x * 100}%`;
        needle.style.opacity = active ? "1" : "0.55";
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

  return { canvasRef, needleRef, numRef };
}

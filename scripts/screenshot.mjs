/**
 * Portfolio screenshot generator.
 *
 * Spins up the Vite dev server and captures the app at an iPhone-class viewport
 * scaled 2× → exactly 780 × 1688. Produces two shots:
 *
 *   public/screenshots/start.png    the start screen (default idle state)
 *   public/screenshots/tuning.png   demo-staging mode (`?demo`), which feeds a scripted
 *                            tuning curve instead of the microphone so the real
 *                            TunerDisplay renders without a live signal — see
 *                            src/hooks/useDemoTuner.ts
 *
 * Re-run any time the UI changes:  npm run screenshot
 * Override the staged note/offset:  npm run screenshot -- --note=D3 --cents=10
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = resolve(root, "public/screenshots");

// Target output is 780 × 1688. We render at half that on a high-DPI viewport so
// the canvas/text render crisply, then capture at the native device pixels.
const VIEWPORT = { width: 390, height: 844 };
const SCALE = 2; // 390×844 @2x = 780×1688

const PORT = 5180;
const BASE = `http://127.0.0.1:${PORT}/`;

// Cap any wait so a regression can't hang the run.
const WAIT_TIMEOUT_MS = 30_000;

function parseArgs() {
  const params = new URLSearchParams();
  for (const arg of process.argv.slice(2)) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) params.set(match[1], match[2]);
  }
  return params;
}

function startServer() {
  const child = spawn(
    "npx",
    ["vite", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"],
    { cwd: root, stdio: ["ignore", "pipe", "inherit"] },
  );
  return new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error("Vite did not start in time")), 30_000);
    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      if (/Local:.*http/.test(String(chunk))) {
        clearTimeout(timer);
        res(child);
      }
    });
    child.on("exit", (code) => rej(new Error(`Vite exited early (code ${code})`)));
  });
}

/** Capture one shot on its own page, then dispose it. */
async function capture(context, { name, url, ready }) {
  const page = await context.newPage();
  try {
    console.log(`Opening ${url}`);
    await page.goto(url, { waitUntil: "networkidle" });
    // Fonts swap in async; wait so text isn't captured mid-fallback.
    await page.evaluate(() => document.fonts.ready);
    await ready(page);
    const out = resolve(outDir, `${name}.png`);
    await page.screenshot({ path: out });
    console.log(`Saved ${out} (${VIEWPORT.width * SCALE} × ${VIEWPORT.height * SCALE})`);
  } finally {
    await page.close();
  }
}

async function main() {
  const params = parseArgs();
  const demoQuery = new URLSearchParams({ demo: "1" });
  for (const [k, v] of params) demoQuery.set(k, v);

  const shots = [
    {
      name: "start",
      url: BASE,
      // Start screen is the default idle state — just wait for it to render.
      ready: (page) =>
        page.waitForSelector(".app.start .button-primary", { timeout: WAIT_TIMEOUT_MS }),
    },
    {
      name: "tuning",
      url: `${BASE}?${demoQuery}`,
      // Demo signals readiness once the trail is full and the head has settled.
      ready: (page) =>
        page.waitForFunction(() => window.__tunerDemoReady === true, null, {
          timeout: WAIT_TIMEOUT_MS,
        }),
    },
  ];

  await mkdir(outDir, { recursive: true });

  console.log("Starting Vite…");
  const server = await startServer();

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: SCALE,
      isMobile: true,
      hasTouch: true,
      colorScheme: "dark",
    });
    for (const shot of shots) {
      await capture(context, shot);
    }
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

import {
  combinePresetAndAppleSplashScreens,
  defineConfig,
  type Preset,
} from "@vite-pwa/assets-generator/config";

// The source icon is full-bleed (a #473144 field with the pick centred), so
// every variant is generated edge-to-edge rather than padded — otherwise the
// art floats small inside the launcher's circular mask. The maskable variant
// keeps a little padding so the pick stays inside Android's safe zone, with the
// background colour filling the margin so the fill still reaches the edges.
const iconPreset: Preset = {
  transparent: {
    sizes: [64, 192, 512],
    favicons: [[48, "favicon.ico"]],
    padding: 0,
  },
  maskable: {
    sizes: [512],
    padding: 0.1,
    resizeOptions: { background: "#473144" },
  },
  apple: {
    sizes: [180],
    padding: 0,
    resizeOptions: { background: "#473144" },
  },
};

// iconPreset (favicon, apple-touch-icon, maskable + transparent PWA icons) plus
// Apple splash screens for every device (light + dark). The splash art is padded
// and sat on a matching background so the splash reads as one seamless screen.
// Wired into the PWA plugin via `pwaAssets` in vite.config.ts; regenerate
// standalone with `npm run generate-pwa-assets`.
export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  preset: combinePresetAndAppleSplashScreens(iconPreset, {
    padding: 0.4,
    resizeOptions: { background: "#473144", fit: "contain" },
    darkResizeOptions: { background: "#473144", fit: "contain" },
    linkMediaOptions: {
      log: true,
      addMediaScreen: true,
      xhtml: false,
    },
  }),
  images: ["public/icon.svg"],
});

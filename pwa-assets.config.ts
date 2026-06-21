import {
  combinePresetAndAppleSplashScreens,
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

// Generates every icon/splash variant from the single source `public/icon.svg`:
//   - favicon.ico, apple-touch-icon, maskable + transparent PWA icons
//   - Apple splash screens (light + dark, all device sizes)
// Wired into the PWA plugin via `pwaAssets` in vite.config.ts; regenerate
// standalone with `npm run generate-pwa-assets`.
export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  // minimal2023Preset (favicon, apple-touch-icon, maskable + transparent PWA
  // icons) plus Apple splash screens for every device (light + dark). The
  // source icon is full-bleed, so pad it and sit it on a matching background
  // — the splash then reads as one seamless screen.
  preset: combinePresetAndAppleSplashScreens(minimal2023Preset, {
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

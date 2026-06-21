import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: "autoUpdate",
      // Generate all icon/splash variants from public/icon.svg and inject the
      // manifest icons + <head> links automatically (see pwa-assets.config.ts).
      pwaAssets: {
        config: true,
      },
      workbox: {
        // Default globs omit fonts; include them so Oswald is available offline.
        globPatterns: ["**/*.{js,css,html,svg,woff,woff2}"],
      },
      manifest: {
        name: "Tuner",
        short_name: "Tuner",
        description: "A free, full-screen instrument tuner.",
        theme_color: "#473144",
        background_color: "#473144",
        // Prefer the most immersive mode; browsers that don't support it fall
        // back down the chain (fullscreen → standalone → minimal-ui → browser).
        display: "fullscreen",
        display_override: ["fullscreen", "standalone"],
        orientation: "portrait",
        start_url: "/",
      },
    }),
  ],
});

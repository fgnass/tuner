import { render } from "preact";
import { App } from "./app";
import "./index.css";

// In dev, evict any service worker / caches left over from a previous
// `npm run preview` or production build — otherwise they serve a stale bundle
// cache-first and you never see your latest changes.
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const r of regs) r.unregister();
  });
  if ("caches" in window)
    caches.keys().then((keys) => {
      for (const k of keys) caches.delete(k);
    });
}

render(<App />, document.getElementById("app")!);

import { useCallback, useEffect, useState } from "preact/hooks";

/** The non-standard event Chromium fires when a PWA is installable. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallPrompt {
  /** A deferred install prompt is available (Android / desktop Chromium). */
  canInstall: boolean;
  /** iOS, where there is no programmatic prompt — only manual "Add to Home Screen". */
  isIOS: boolean;
  /** Already running as an installed app, so no install affordance is needed. */
  isStandalone: boolean;
  /** Show the native install dialog. No-op unless `canInstall`. */
  promptInstall: () => void;
}

function matchStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari exposes installed state here instead of via display-mode.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as "MacIntel" but is distinguishable by touch support.
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Surface a PWA install affordance. Chromium fires `beforeinstallprompt`, which
 * we capture and defer so the UI can offer install on demand; iOS fires nothing,
 * so callers fall back to a manual "Add to Home Screen" hint.
 */
export function useInstallPrompt(): InstallPrompt {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(matchStandalone);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // stop Chrome's own mini-infobar; we drive it ourselves
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setIsStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(() => {
    if (!deferred) return;
    deferred.prompt();
    // The event can only be used once — drop it whatever the user chooses.
    deferred.userChoice.finally(() => setDeferred(null));
  }, [deferred]);

  return {
    canInstall: deferred !== null && !isStandalone,
    isIOS: detectIOS(),
    isStandalone,
    promptInstall,
  };
}

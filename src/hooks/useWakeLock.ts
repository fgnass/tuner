import { useCallback, useEffect, useRef } from "preact/hooks";

export function useWakeLock() {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const desiredRef = useRef(false);
  const requestingRef = useRef(false);

  const request = useCallback(async () => {
    desiredRef.current = true;

    if (
      typeof navigator === "undefined" ||
      !("wakeLock" in navigator) ||
      document.visibilityState !== "visible" ||
      sentinelRef.current ||
      requestingRef.current
    ) {
      return;
    }

    requestingRef.current = true;
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      sentinelRef.current = sentinel;
      sentinel.addEventListener("release", () => {
        if (sentinelRef.current === sentinel) sentinelRef.current = null;
      });
    } catch {
      sentinelRef.current = null;
    } finally {
      requestingRef.current = false;
    }
  }, []);

  const release = useCallback(async () => {
    desiredRef.current = false;
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;

    if (!sentinel || sentinel.released) return;

    try {
      await sentinel.release();
    } catch {
      // The platform may already have released it.
    }
  }, []);

  useEffect(() => {
    const restore = () => {
      if (document.visibilityState === "visible" && desiredRef.current) {
        void request();
      }
    };

    document.addEventListener("visibilitychange", restore);
    return () => {
      document.removeEventListener("visibilitychange", restore);
      void release();
    };
  }, [request, release]);

  return { request, release };
}

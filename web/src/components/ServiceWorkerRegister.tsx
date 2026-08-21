"use client";

import { useEffect } from "react";

/** Registers SW and clears broken old caches that could serve unstyled HTML. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let cancelled = false;

    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        // Drop any worker still on old cache-first HTML strategy, then re-register.
        await Promise.all(regs.map((r) => r.unregister()));
        if (cancelled) return;
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((k) => k.startsWith("scanno-"))
              .map((k) => caches.delete(k))
          );
        }
        if (cancelled) return;
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        /* ignore in dev */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

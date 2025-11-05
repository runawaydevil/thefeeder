"use client";

import { useEffect } from "react";

/**
 * Service Worker Registration Component
 * Registers the service worker for PWA functionality
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register in browser and production
    if (
      typeof window === "undefined" ||
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    // Register service worker
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("[SW] Service Worker registered:", registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Handle updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New service worker available
                console.log("[SW] New service worker available");
                // Optional: Show update notification to user
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error("[SW] Service Worker registration failed:", error);
      });

    // Handle controller change (new service worker activated)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("[SW] Service Worker controller changed");
      // Optional: Reload page to use new service worker
      // window.location.reload();
    });
  }, []);

  return null;
}


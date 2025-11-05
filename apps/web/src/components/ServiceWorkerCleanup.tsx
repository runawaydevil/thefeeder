"use client";

import { useEffect, useRef } from "react";

/**
 * Client-side component to cleanup service workers and cache
 * This runs ONLY after React hydration to avoid hydration errors
 */
export default function ServiceWorkerCleanup() {
  const isCleaningRef = useRef(false);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === "undefined") {
      return;
    }

    // Version tracking for cache invalidation
    const APP_VERSION = "0.0.2";
    const VERSION_KEY = "thefeeder_app_version";

    // Check if version changed and clear cache if needed
    // This function schedules a reload but waits for hydration to complete
    function checkVersionAndClearCache(): boolean {
      try {
        const storedVersion = sessionStorage.getItem(VERSION_KEY);
        if (storedVersion !== APP_VERSION) {
          console.log(
            "[SW] Version changed from",
            storedVersion,
            "to",
            APP_VERSION,
            "- clearing cache",
          );

          // Clear all storage only when version actually changes
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch (e) {
            console.warn("[SW] Error clearing storage:", e);
          }

          // Update stored version
          sessionStorage.setItem(VERSION_KEY, APP_VERSION);

          // Wait for hydration to complete before reloading
          // Use requestIdleCallback if available, otherwise use a longer setTimeout
          const scheduleReload = () => {
            // Wait additional time to ensure React hydration is complete
            // React typically hydrates within 100-500ms, so 1000ms is safe
            setTimeout(() => {
              // Force reload without cache
              window.location.reload();
            }, 1000);
          };

          if (typeof window.requestIdleCallback === "function") {
            window.requestIdleCallback(scheduleReload, { timeout: 2000 });
          } else {
            // Fallback: wait for load event or use setTimeout
            if (document.readyState === "complete") {
              scheduleReload();
            } else {
              window.addEventListener(
                "load",
                scheduleReload,
                { once: true }
              );
            }
          }

          return true;
        }
        return false;
      } catch (e) {
        console.warn("[SW] Error checking version:", e);
        return false;
      }
    }

    // Aggressive service worker cleanup - runs first
    // Only execute if not already cleaning
    function cleanupServiceWorkers() {
      // Prevent multiple simultaneous executions
      if (isCleaningRef.current) {
        return;
      }
      isCleaningRef.current = true;

      try {
        if (!("serviceWorker" in navigator)) {
          isCleaningRef.current = false;
          return;
        }

        // Step 1: Only block registrations in development
        // In production, allow ServiceWorkerRegistration to register the new SW
        if (process.env.NODE_ENV !== "production") {
          const originalRegister = navigator.serviceWorker.register;
          navigator.serviceWorker.register = function () {
            console.warn("[SW] Registration blocked in development:", arguments);
            return Promise.reject(
              new Error("Service worker registration is disabled in development"),
            );
          };
        }

        // Step 2: Unregister all existing service workers WITHOUT calling update()
        // Calling update() triggers the browser to try fetching sw.js which causes 404 errors
        navigator.serviceWorker
          .getRegistrations()
          .then(function (registrations) {
            return Promise.all(
              registrations.map(function (registration) {
                try {
                  // Unregister immediately without update() to avoid 404 errors
                  return registration
                    .unregister()
                    .then(function (unregistered) {
                      if (unregistered) {
                        console.log(
                          "[SW] Unregistered:",
                          registration.scope,
                        );
                      }
                      return unregistered;
                    })
                    .catch(function (e) {
                      console.warn(
                        "[SW] Error unregistering:",
                        registration.scope,
                        e,
                      );
                      return false;
                    });
                } catch (e) {
                  console.warn("[SW] Error processing registration:", e);
                  return false;
                }
              }),
            );
          })
          .catch(function (e) {
            console.warn("[SW] Error getting registrations:", e);
          });

        // Step 3: Clear all caches and storage immediately
        // Clear Cache API
        if ("caches" in window) {
          caches
            .keys()
            .then(function (cacheNames) {
              return Promise.all(
                cacheNames.map(function (cacheName) {
                  return caches
                    .delete(cacheName)
                    .then(function (deleted) {
                      if (deleted) {
                        console.log("[SW] Cache deleted:", cacheName);
                      }
                      return deleted;
                    })
                    .catch(function (e) {
                      console.warn(
                        "[SW] Error deleting cache:",
                        cacheName,
                        e,
                      );
                      return false;
                    });
                }),
              );
            })
            .catch(function (e) {
              console.warn("[SW] Error accessing caches:", e);
            });
        }

        // Note: We don't clear localStorage/sessionStorage here
        // They are only cleared when version changes (in checkVersionAndClearCache)
        // This prevents unnecessary clearing on every page load

        // Clear IndexedDB
        if ("indexedDB" in window && indexedDB.databases) {
          indexedDB
            .databases()
            .then(function (databases) {
              return Promise.all(
                databases
                  .filter(function (db) {
                    return db.name !== undefined;
                  })
                  .map(function (db) {
                    const dbName = db.name!; // Already filtered undefined
                    return new Promise(function (resolve) {
                      const deleteReq = indexedDB.deleteDatabase(dbName);
                      deleteReq.onsuccess = function () {
                        console.log("[SW] IndexedDB deleted:", dbName);
                        resolve(true);
                      };
                      deleteReq.onerror = function () {
                        console.warn("[SW] Error deleting IndexedDB:", dbName);
                        resolve(false);
                      };
                      deleteReq.onblocked = function () {
                        console.warn(
                          "[SW] IndexedDB deletion blocked:",
                          dbName,
                        );
                        resolve(false);
                      };
                    });
                  }),
              );
            })
            .catch(function (e) {
              console.warn("[SW] Error accessing IndexedDB:", e);
            });
        }

        // Step 4: Force controller to skip waiting if exists
        if (navigator.serviceWorker.controller) {
          try {
            navigator.serviceWorker.controller.postMessage({
              type: "SKIP_WAITING",
            });
          } catch (e) {
            console.warn("[SW] Error sending SKIP_WAITING:", e);
          }
        }

        // Step 5: Add event listeners to catch any new registrations
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          function () {
            console.warn("[SW] Controller changed - cleaning up again");
            setTimeout(cleanupServiceWorkers, 100);
          },
        );

        navigator.serviceWorker.addEventListener("message", function (event) {
          if (event.data && event.data.type === "SKIP_WAITING") {
            console.log("[SW] Received SKIP_WAITING message");
          }
        });

        console.log("[SW] Cleanup completed");
      } catch (e) {
        console.error("[SW] Cleanup error:", e);
      } finally {
        // Reset flag after cleanup completes
        isCleaningRef.current = false;
      }
    }

    // Check version first - if changed, reload and don't run cleanup
    if (!checkVersionAndClearCache()) {
      // Version unchanged, proceed with cleanup
      // Consolidated cleanup function that handles all scenarios
      const scheduleCleanup = (delay: number) => {
        // Clear any existing timeout
        if (cleanupTimeoutRef.current) {
          clearTimeout(cleanupTimeoutRef.current);
        }
        
        // Schedule new cleanup with debounce
        cleanupTimeoutRef.current = setTimeout(() => {
          cleanupServiceWorkers();
          cleanupTimeoutRef.current = null;
        }, delay);
      };

      // Run cleanup after hydration is complete
      scheduleCleanup(100);

      // Run on various events to catch any edge cases
      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          function () {
            scheduleCleanup(50);
          },
          { once: true },
        );
      }

      window.addEventListener(
        "load",
        function () {
          scheduleCleanup(100);
        },
        { once: true },
      );

      window.addEventListener("pageshow", function (event) {
        if (event.persisted) {
          scheduleCleanup(50);
        }
      });

      // Cleanup function to clear timeout on unmount
      return () => {
        if (cleanupTimeoutRef.current) {
          clearTimeout(cleanupTimeoutRef.current);
          cleanupTimeoutRef.current = null;
        }
      };
    }
  }, []); // Run only once after mount

  // Component doesn't render anything
  return null;
}

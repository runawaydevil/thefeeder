export const metadata = {
  title: "TheFeeder",
  description: "Modern feed reader and daily digest",
  icons: {
    icon: "/logo.png",
  },
};

import "./globals.css";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Audiowide&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if ('serviceWorker' in navigator) {
                  // Aggressively unregister all service workers and clear caches
                  async function cleanupServiceWorkers() {
                    try {
                      // Step 1: Unregister all service workers
                      const registrations = await navigator.serviceWorker.getRegistrations();
                      await Promise.all(
                        registrations.map(async function(registration) {
                          try {
                            const unregistered = await registration.unregister();
                            if (unregistered) {
                              console.log('[SW] Service Worker unregistered:', registration.scope);
                            }
                          } catch (e) {
                            console.warn('[SW] Error unregistering:', e);
                          }
                        })
                      );
                      
                      // Step 2: Clear all caches
                      if ('caches' in window) {
                        try {
                          const cacheNames = await caches.keys();
                          await Promise.all(
                            cacheNames.map(async function(cacheName) {
                              try {
                                await caches.delete(cacheName);
                                console.log('[SW] Cache deleted:', cacheName);
                              } catch (e) {
                                console.warn('[SW] Error deleting cache:', cacheName, e);
                              }
                            })
                          );
                        } catch (e) {
                          console.warn('[SW] Error accessing caches:', e);
                        }
                      }
                      
                      // Step 3: Force update controller if exists
                      if (navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
                      }
                      
                      console.log('[SW] Cleanup completed');
                    } catch (e) {
                      console.error('[SW] Cleanup error:', e);
                    }
                  }
                  
                  // Run immediately
                  cleanupServiceWorkers();
                  
                  // Also run on page load as fallback
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', cleanupServiceWorkers);
                  } else {
                    window.addEventListener('load', cleanupServiceWorkers);
                  }
                  
                  // Prevent any new service workers from being registered
                  navigator.serviceWorker.addEventListener('controllerchange', function() {
                    cleanupServiceWorkers();
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body className="font-orbitron">
        {children}
      </body>
    </html>
  );
}



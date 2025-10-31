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
        <meta httpEquiv="Clear-Site-Data" content="cache, storage, serviceworkers" />
        <link rel="icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Audiowide&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Execute immediately - before any other scripts
                'use strict';
                
                // Aggressive service worker cleanup - runs first
                function cleanupServiceWorkers() {
                  try {
                    if (!('serviceWorker' in navigator)) {
                      return;
                    }
                    
                    // Step 1: Immediately prevent any new registrations
                    const originalRegister = navigator.serviceWorker.register;
                    navigator.serviceWorker.register = function() {
                      console.warn('[SW] Registration blocked:', arguments);
                      return Promise.reject(new Error('Service worker registration is disabled'));
                    };
                    
                    // Step 2: Unregister all existing service workers
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                      return Promise.all(
                        registrations.map(function(registration) {
                          try {
                            registration.update();
                            return registration.unregister().then(function(unregistered) {
                              if (unregistered) {
                                console.log('[SW] Unregistered:', registration.scope);
                              }
                              return unregistered;
                            }).catch(function(e) {
                              console.warn('[SW] Error unregistering:', registration.scope, e);
                              return false;
                            });
                          } catch (e) {
                            console.warn('[SW] Error processing registration:', e);
                            return false;
                          }
                        })
                      );
                    }).catch(function(e) {
                      console.warn('[SW] Error getting registrations:', e);
                    });
                    
                    // Step 3: Clear all caches immediately
                    if ('caches' in window) {
                      caches.keys().then(function(cacheNames) {
                        return Promise.all(
                          cacheNames.map(function(cacheName) {
                            return caches.delete(cacheName).then(function(deleted) {
                              if (deleted) {
                                console.log('[SW] Cache deleted:', cacheName);
                              }
                              return deleted;
                            }).catch(function(e) {
                              console.warn('[SW] Error deleting cache:', cacheName, e);
                              return false;
                            });
                          })
                        );
                      }).catch(function(e) {
                        console.warn('[SW] Error accessing caches:', e);
                      });
                    }
                    
                    // Step 4: Force controller to skip waiting if exists
                    if (navigator.serviceWorker.controller) {
                      try {
                        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
                      } catch (e) {
                        console.warn('[SW] Error sending SKIP_WAITING:', e);
                      }
                    }
                    
                    // Step 5: Add event listeners to catch any new registrations
                    navigator.serviceWorker.addEventListener('controllerchange', function() {
                      console.warn('[SW] Controller changed - cleaning up again');
                      setTimeout(cleanupServiceWorkers, 100);
                    });
                    
                    navigator.serviceWorker.addEventListener('message', function(event) {
                      if (event.data && event.data.type === 'SKIP_WAITING') {
                        console.log('[SW] Received SKIP_WAITING message');
                      }
                    });
                    
                    console.log('[SW] Cleanup completed');
                  } catch (e) {
                    console.error('[SW] Cleanup error:', e);
                  }
                }
                
                // Run cleanup multiple times with different strategies
                cleanupServiceWorkers();
                
                // Run on various events to catch any edge cases
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', cleanupServiceWorkers, { once: true });
                }
                
                window.addEventListener('load', cleanupServiceWorkers, { once: true });
                window.addEventListener('pageshow', function(event) {
                  if (event.persisted) {
                    cleanupServiceWorkers();
                  }
                });
                
                // Periodic cleanup to catch any late registrations
                setTimeout(cleanupServiceWorkers, 100);
                setTimeout(cleanupServiceWorkers, 500);
                setTimeout(cleanupServiceWorkers, 1000);
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



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
              if ('serviceWorker' in navigator) {
                // First, unregister all existing service workers
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister().then(function(success) {
                      if (success) {
                        console.log('Service Worker unregistered');
                      }
                    });
                  }
                  // Clear all caches after unregistering
                  if ('caches' in window) {
                    caches.keys().then(function(cacheNames) {
                      return Promise.all(
                        cacheNames.map(function(cacheName) {
                          return caches.delete(cacheName);
                        })
                      );
                    });
                  }
                });
              }
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



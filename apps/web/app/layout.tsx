export const metadata = {
  title: "TheFeeder",
  description: "Modern feed reader and daily digest",
  icons: {
    icon: "/logo.png",
  },
};

import "./globals.css";
import { ReactNode } from "react";
import ServiceWorkerCleanup from "@/src/components/ServiceWorkerCleanup";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta httpEquiv="Clear-Site-Data" content="cache, storage, serviceworkers" />
        <link rel="icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Audiowide&display=swap" rel="stylesheet" />
      </head>
      <body className="font-orbitron" suppressHydrationWarning>
        <ServiceWorkerCleanup />
        {children}
      </body>
    </html>
  );
}



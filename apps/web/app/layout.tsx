import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ReactNode } from "react";
import ServiceWorkerCleanup from "@/src/components/ServiceWorkerCleanup";

export const metadata: Metadata = {
  title: "TheFeeder",
  description: "Modern feed reader and daily digest",
  icons: {
    icon: "/logo.png",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-orbitron">
        <ServiceWorkerCleanup />
        {children}
      </body>
    </html>
  );
}



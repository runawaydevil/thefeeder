import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./themes.css";
import { ReactNode } from "react";
import ServiceWorkerCleanup from "@/src/components/ServiceWorkerCleanup";
import ServiceWorkerRegistration from "@/src/components/ServiceWorkerRegistration";
import { ThemeProvider } from "@/src/contexts/ThemeContext";
import { getBaseUrl, getAbsoluteUrl, getDefaultOgImage } from "@/src/lib/seo-utils";

const siteUrl = getBaseUrl();
const defaultImage = getDefaultOgImage();

export const metadata: Metadata = {
  title: {
    default: "TheFeeder",
    template: "%s | TheFeeder",
  },
  description: "Modern RSS feed reader and daily digest aggregator. Stay updated with the latest articles from your favorite feeds.",
  keywords: ["RSS", "feed reader", "news aggregator", "RSS aggregator", "daily digest", "news reader"],
  authors: [{ name: "Pablo Murad" }],
  creator: "Pablo Murad",
  publisher: "TheFeeder",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "TheFeeder",
    title: "TheFeeder - Modern RSS Aggregator",
    description: "Modern RSS feed reader and daily digest aggregator. Stay updated with the latest articles from your favorite feeds.",
    images: [
      {
        url: defaultImage,
        width: 512,
        height: 512,
        alt: "TheFeeder Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TheFeeder - Modern RSS Aggregator",
    description: "Modern RSS feed reader and daily digest aggregator. Stay updated with the latest articles from your favorite feeds.",
    images: [defaultImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TheFeeder",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#00ffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'vaporwave';
                  document.documentElement.setAttribute('data-theme', theme);
                  if (!localStorage.getItem('theme')) {
                    localStorage.setItem('theme', 'vaporwave');
                  }
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'vaporwave');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="font-orbitron" suppressHydrationWarning>
        <ThemeProvider>
          <ServiceWorkerCleanup />
          <ServiceWorkerRegistration />
          {children}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        </ThemeProvider>
      </body>
    </html>
  );
}



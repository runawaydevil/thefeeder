/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  // Ensure static assets are served correctly
  poweredByHeader: false,
  compress: true,
  // Ensure proper asset serving
  assetPrefix: undefined, // Use default Next.js asset serving
  // Headers for static assets
  async headers() {
    const headers = [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'production' 
              ? 'public, max-age=31536000, immutable' 
              : 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      // Headers for logo.png to ensure correct Content-Type
      {
        source: '/logo.png',
        headers: [
          {
            key: 'Content-Type',
            value: 'image/png',
          },
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'production' 
              ? 'public, max-age=31536000, immutable' 
              : 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      // Headers for favicon.ico
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Content-Type',
            value: 'image/x-icon',
          },
        ],
      },
      // Headers for manifest.json
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      // Headers for service worker
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
    
    // Add no-cache headers for HTML in development
    if (process.env.NODE_ENV !== 'production') {
      headers.push({
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      });
    }
    
    return headers;
  },
  // Redirect old /assets/ paths to /_next/static/
  async rewrites() {
    return [
      {
        source: '/assets/:path*',
        destination: '/_next/static/:path*',
      },
    ];
  },
};

export default nextConfig;



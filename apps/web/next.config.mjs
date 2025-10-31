/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  outputFileTracingRoot: process.cwd(),
  // Ensure static assets are served correctly
  poweredByHeader: false,
  compress: true,
  // Ensure proper asset serving
  assetPrefix: undefined, // Use default Next.js asset serving
  // Headers for static assets
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;



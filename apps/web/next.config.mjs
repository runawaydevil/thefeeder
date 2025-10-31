/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  outputFileTracingRoot: process.cwd(),
  // Ensure static assets are served correctly
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;



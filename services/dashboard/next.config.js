/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize images
  images: {
    unoptimized: true, // For development
  },
  // Enable TypeScript strict mode
  typescript: {
    ignoreBuildErrors: false,
  },
  // Enable ESLint during builds
  eslint: {
    ignoreDuringBuilds: false,
  },
  // React 18 compatibility
  reactStrictMode: true,
  // Set correct workspace root to avoid lockfile warnings
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;

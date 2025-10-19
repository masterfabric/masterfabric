/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    esmExternals: false,
  },
  // Disable static optimization for pages that use Apollo Client
  generateStaticParams: false,
};

module.exports = nextConfig;
